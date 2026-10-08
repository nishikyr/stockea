package dto

import (
	"time"

	"github.com/nishikyr/stockea/internal/db"
)

type MovementRequest struct {
	Type     string `json:"type"`     // "in" | "out" | "adjust"
	Quantity int32  `json:"quantity"` // en "adjust": cuántas hay tras contarlas
	Reason   string `json:"reason"`   // opcional, p. ej. "Me lo llevé a casa"
}

type MovementResponse struct {
	ID          string    `json:"id"`
	ProductID   string    `json:"product_id"`
	ProductName string    `json:"product_name"`
	Type        string    `json:"type"`
	Delta       int32     `json:"delta"` // cuánto cambió el stock: +5, -2...
	Unit        string    `json:"unit"`
	Reason      string    `json:"reason"`
	UserID      string    `json:"user_id"`
	UserName    string    `json:"user_name"`
	CreatedAt   time.Time `json:"created_at"`
}

// RegisterMovementResponse: el movimiento creado y el stock resultante.
type RegisterMovementResponse struct {
	Movement    MovementResponse `json:"movement"`
	NewQuantity int32            `json:"new_quantity"`
	LowStock    bool             `json:"low_stock"`
}

// delta: en la BD, "in" y "out" guardan la cantidad en positivo; "adjust" guarda la diferencia.
func delta(t db.MovementType, quantity int32) int32 {
	if t == db.MovementTypeOut {
		return -quantity
	}
	return quantity
}

func NewMovementResponse(m db.ListMovementsRow) MovementResponse {
	return MovementResponse{
		ID:          UUIDString(m.ID),
		ProductID:   UUIDString(m.ProductID),
		ProductName: m.ProductName,
		Type:        string(m.Type),
		Delta:       delta(m.Type, m.Quantity),
		Unit:        m.ProductUnit,
		Reason:      m.Reason.String,
		UserID:      UUIDString(m.UserID),
		UserName:    m.UserName,
		CreatedAt:   m.CreatedAt.Time,
	}
}

func NewMovementListResponse(rows []db.ListMovementsRow) []MovementResponse {
	out := make([]MovementResponse, len(rows))
	for i, r := range rows {
		out[i] = NewMovementResponse(r)
	}
	return out
}

func NewRegisterMovementResponse(m db.Movement, p db.Product, user db.User) RegisterMovementResponse {
	return RegisterMovementResponse{
		Movement: NewMovementResponse(db.ListMovementsRow{
			ID: m.ID, ProductID: m.ProductID, UserID: m.UserID, Type: m.Type,
			Quantity: m.Quantity, Reason: m.Reason, CreatedAt: m.CreatedAt,
			ProductName: p.Name, ProductUnit: p.Unit, UserName: user.Name,
		}),
		NewQuantity: p.Quantity,
		LowStock:    p.Quantity <= p.MinQuantity,
	}
}

type BatchItemRequest struct {
	ProductID string `json:"product_id"`
	Quantity  int32  `json:"quantity"`
}

// BatchMovementRequest: varias cosas a la vez, con un mismo tipo y motivo.
type BatchMovementRequest struct {
	Type   string             `json:"type"` // "in" | "out"
	Reason string             `json:"reason"`
	Items  []BatchItemRequest `json:"items"`
}
