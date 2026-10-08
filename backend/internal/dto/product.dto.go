package dto

import (
	"time"

	"github.com/nishikyr/stockea/internal/db"
)

type ProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	CategoryID  *string `json:"category_id"` // null → sin categoría
	LocationID  *string `json:"location_id"` // null → sin ubicación
	Unit        string  `json:"unit"`        // "uds" por defecto
	MinQuantity int32   `json:"min_quantity"`
}

// CreateProductRequest añade el stock inicial, que solo se puede indicar al crear.
type CreateProductRequest struct {
	ProductRequest
	Quantity int32 `json:"quantity"`
}

type CategoryRef struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
	Icon  string `json:"icon"`
}

type LocationRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProductResponse struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Quantity    int32        `json:"quantity"`
	Unit        string       `json:"unit"`
	MinQuantity int32        `json:"min_quantity"`
	LowStock    bool         `json:"low_stock"` // true si quantity <= min_quantity
	Category    *CategoryRef `json:"category"`  // null si no tiene
	Location    *LocationRef `json:"location"`  // null si no tiene
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

func NewProductResponse(p db.ListProductsRow) ProductResponse {
	res := ProductResponse{
		ID:          UUIDString(p.ID),
		Name:        p.Name,
		Description: p.Description.String,
		Quantity:    p.Quantity,
		Unit:        p.Unit,
		MinQuantity: p.MinQuantity,
		LowStock:    p.Quantity <= p.MinQuantity,
		CreatedAt:   p.CreatedAt.Time,
		UpdatedAt:   p.UpdatedAt.Time,
	}
	if p.CategoryID.Valid {
		res.Category = &CategoryRef{
			ID:    UUIDString(p.CategoryID),
			Name:  p.CategoryName.String,
			Color: p.CategoryColor.String,
			Icon:  p.CategoryIcon.String,
		}
	}
	if p.LocationID.Valid {
		res.Location = &LocationRef{ID: UUIDString(p.LocationID), Name: p.LocationName.String}
	}
	return res
}

func NewProductListResponse(rows []db.ListProductsRow) []ProductResponse {
	out := make([]ProductResponse, len(rows))
	for i, r := range rows {
		out[i] = NewProductResponse(r)
	}
	return out
}
