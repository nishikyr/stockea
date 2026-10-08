package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/db"
)

// Tipos de movimiento:
//
//	in     → entra stock      (quantity = cuántas unidades entran)
//	out    → sale stock       (quantity = cuántas unidades salen)
//	adjust → recuento manual  (quantity = cuántas hay de verdad tras contarlas)
//
// En la tabla movements, para "adjust" se guarda la DIFERENCIA aplicada (+2, -1...),
// así el historial dice exactamente cuánto cambió el stock en cada paso.
const (
	MovementIn     = "in"
	MovementOut    = "out"
	MovementAdjust = "adjust"
)

const maxBatchItems = 50

type MovementService struct {
	pool TxStarter
	q    *db.Queries
}

func NewMovementService(pool TxStarter, q *db.Queries) *MovementService {
	return &MovementService{pool: pool, q: q}
}

type MovementInput struct {
	Type     string
	Quantity int32
	Reason   string
}

type MovementResult struct {
	Movement    db.Movement
	Product     db.Product // con la cantidad ya actualizada
	NewQuantity int32
}

// Register aplica un movimiento a UN producto y lo guarda en el historial, en una transacción.
func (s *MovementService) Register(ctx context.Context, projectID, productID pgtype.UUID, user db.User, in MovementInput) (MovementResult, error) {
	in.Reason = strings.TrimSpace(in.Reason)
	if err := validateMovement(in.Type, in.Quantity, in.Reason); err != nil {
		return MovementResult{}, err
	}

	var result MovementResult
	err := withTx(ctx, s.pool, s.q, func(q *db.Queries) error {
		// FOR UPDATE: bloquea el producto hasta el commit (evita carreras entre dos usuarios)
		p, err := q.GetProductForUpdate(ctx, db.GetProductForUpdateParams{ProjectID: projectID, ID: productID})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProductNotFound
		}
		if err != nil {
			return err
		}
		result, err = applyMovement(ctx, q, p, user, in)
		return err
	})
	return result, err
}

// BatchItem: un producto y cuántas unidades entran o salen.
type BatchItem struct {
	ProductID pgtype.UUID
	Quantity  int32
}

type BatchInput struct {
	Type   string // solo "in" u "out" (un recuento múltiple no tiene sentido)
	Reason string // el mismo motivo para todo el lote, p. ej. "Mudanza"
	Items  []BatchItem
}

// RegisterBatch saca (o guarda) varios productos de una vez: TODO O NADA.
// Si a uno le falta stock, no se toca ninguno y el error dice cuál es.
func (s *MovementService) RegisterBatch(ctx context.Context, projectID pgtype.UUID, user db.User, in BatchInput) ([]MovementResult, error) {
	in.Reason = strings.TrimSpace(in.Reason)
	switch {
	case in.Type != MovementIn && in.Type != MovementOut:
		return nil, validation(`en un movimiento múltiple el tipo debe ser "in" u "out"`)
	case len(in.Items) == 0:
		return nil, validation("elige al menos un producto")
	case len(in.Items) > maxBatchItems:
		return nil, validation("como máximo 50 productos por movimiento")
	}

	ids := make([]pgtype.UUID, len(in.Items))
	seen := make(map[[16]byte]bool, len(in.Items))
	for i, it := range in.Items {
		if err := validateMovement(in.Type, it.Quantity, in.Reason); err != nil {
			return nil, err
		}
		if seen[it.ProductID.Bytes] {
			return nil, validation("hay un producto repetido en la lista")
		}
		seen[it.ProductID.Bytes] = true
		ids[i] = it.ProductID
	}

	var results []MovementResult
	err := withTx(ctx, s.pool, s.q, func(q *db.Queries) error {
		// Bloquea todos los productos del lote, siempre ordenados por id (evita deadlocks)
		products, err := q.GetProductsForUpdate(ctx, db.GetProductsForUpdateParams{ProjectID: projectID, Ids: ids})
		if err != nil {
			return err
		}
		if len(products) != len(ids) {
			return ErrProductNotFound // alguno no existe o es de otro proyecto
		}
		byID := make(map[[16]byte]db.Product, len(products))
		for _, p := range products {
			byID[p.ID.Bytes] = p
		}

		// Se aplican en el orden en que llegaron, para que la respuesta coincida con la petición
		results = make([]MovementResult, 0, len(in.Items))
		for _, it := range in.Items {
			p := byID[it.ProductID.Bytes]
			r, err := applyMovement(ctx, q, p, user, MovementInput{Type: in.Type, Quantity: it.Quantity, Reason: in.Reason})
			if err != nil {
				var appErr *Error
				if errors.As(err, &appErr) && appErr.Kind == KindConflict {
					// Añadimos el nombre del producto: "Taladro Bosch: no hay suficiente stock..."
					return &Error{KindConflict, fmt.Sprintf("%s: %s", p.Name, appErr.Message)}
				}
				return err
			}
			results = append(results, r)
		}
		return nil
	})
	return results, err
}

// applyMovement calcula el nuevo stock, lo guarda y crea el movimiento.
// Debe llamarse DENTRO de una transacción y con el producto ya bloqueado.
func applyMovement(ctx context.Context, q *db.Queries, p db.Product, user db.User, in MovementInput) (MovementResult, error) {
	var newQty, stored int32
	switch in.Type {
	case MovementIn:
		newQty, stored = p.Quantity+in.Quantity, in.Quantity
	case MovementOut:
		if in.Quantity > p.Quantity {
			return MovementResult{}, insufficientStock(p.Quantity, p.Unit)
		}
		newQty, stored = p.Quantity-in.Quantity, in.Quantity
	case MovementAdjust:
		if in.Quantity == p.Quantity {
			return MovementResult{}, ErrNothingToAdjust
		}
		newQty, stored = in.Quantity, in.Quantity-p.Quantity
	}
	if newQty > maxQuantity {
		return MovementResult{}, validation("el stock resultante es demasiado grande")
	}

	if err := q.SetProductQuantity(ctx, db.SetProductQuantityParams{ID: p.ID, Quantity: newQty}); err != nil {
		return MovementResult{}, err
	}
	m, err := q.CreateMovement(ctx, db.CreateMovementParams{
		ProductID: p.ID,
		UserID:    user.ID,
		Type:      db.MovementType(in.Type),
		Quantity:  stored,
		Reason:    optionalText(in.Reason),
	})
	if err != nil {
		return MovementResult{}, err
	}
	p.Quantity = newQty
	return MovementResult{Movement: m, Product: p, NewQuantity: newQty}, nil
}

func validateMovement(typ string, quantity int32, reason string) error {
	switch {
	case typ != MovementIn && typ != MovementOut && typ != MovementAdjust:
		return validation(`el tipo debe ser "in", "out" o "adjust"`)
	case typ != MovementAdjust && (quantity <= 0 || quantity > maxQuantity):
		return validation("la cantidad debe ser mayor que 0")
	case typ == MovementAdjust && (quantity < 0 || quantity > maxQuantity):
		return validation("la cantidad contada no puede ser negativa")
	case len(reason) > 200:
		return validation("el motivo no puede superar 200 caracteres")
	}
	return nil
}

type MovementFilter struct {
	ProductID pgtype.UUID // Valid=false → todo el proyecto
	Type      string      // "" → todos los tipos
	Limit     int32
	Offset    int32
}

func (s *MovementService) List(ctx context.Context, projectID pgtype.UUID, f MovementFilter) ([]db.ListMovementsRow, error) {
	if f.Type != "" && f.Type != MovementIn && f.Type != MovementOut && f.Type != MovementAdjust {
		return nil, validation(`el tipo debe ser "in", "out" o "adjust"`)
	}
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	return s.q.ListMovements(ctx, db.ListMovementsParams{
		ProjectID: projectID,
		ProductID: f.ProductID,
		Type:      db.NullMovementType{MovementType: db.MovementType(f.Type), Valid: f.Type != ""},
		MaxRows:   f.Limit,
		SkipRows:  f.Offset,
	})
}
