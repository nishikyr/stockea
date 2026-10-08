package services

import (
	"context"
	"errors"
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

// Register aplica un movimiento de stock y lo guarda en el historial, en una sola transacción.
func (s *MovementService) Register(ctx context.Context, projectID, productID pgtype.UUID, user db.User, in MovementInput) (MovementResult, error) {
	in.Reason = strings.TrimSpace(in.Reason)
	switch {
	case in.Type != MovementIn && in.Type != MovementOut && in.Type != MovementAdjust:
		return MovementResult{}, validation(`el tipo debe ser "in", "out" o "adjust"`)
	case in.Type != MovementAdjust && (in.Quantity <= 0 || in.Quantity > maxQuantity):
		return MovementResult{}, validation("la cantidad debe ser mayor que 0")
	case in.Type == MovementAdjust && (in.Quantity < 0 || in.Quantity > maxQuantity):
		return MovementResult{}, validation("la cantidad contada no puede ser negativa")
	case len(in.Reason) > 200:
		return MovementResult{}, validation("el motivo no puede superar 200 caracteres")
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

		var newQty, stored int32
		switch in.Type {
		case MovementIn:
			newQty, stored = p.Quantity+in.Quantity, in.Quantity
		case MovementOut:
			if in.Quantity > p.Quantity {
				return insufficientStock(p.Quantity, p.Unit)
			}
			newQty, stored = p.Quantity-in.Quantity, in.Quantity
		case MovementAdjust:
			if in.Quantity == p.Quantity {
				return ErrNothingToAdjust
			}
			newQty, stored = in.Quantity, in.Quantity-p.Quantity
		}
		if newQty > maxQuantity {
			return validation("el stock resultante es demasiado grande")
		}

		if err := q.SetProductQuantity(ctx, db.SetProductQuantityParams{ID: p.ID, Quantity: newQty}); err != nil {
			return err
		}
		m, err := q.CreateMovement(ctx, db.CreateMovementParams{
			ProductID: p.ID,
			UserID:    user.ID,
			Type:      db.MovementType(in.Type),
			Quantity:  stored,
			Reason:    optionalText(in.Reason),
		})
		if err != nil {
			return err
		}
		p.Quantity = newQty
		result = MovementResult{Movement: m, Product: p, NewQuantity: newQty}
		return nil
	})
	return result, err
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
