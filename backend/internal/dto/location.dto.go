package dto

import "github.com/nishikyr/stockea/internal/db"

type LocationRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	ParentID    *string `json:"parent_id"` // null o "" → primer nivel
}

type LocationResponse struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	ParentID     *string `json:"parent_id"`
	ProductCount int32   `json:"product_count"`
}

func NewLocationResponse(l db.Location) LocationResponse {
	return LocationResponse{
		ID:          UUIDString(l.ID),
		Name:        l.Name,
		Description: l.Description.String,
		ParentID:    UUIDPtr(l.ParentID),
	}
}

// La lista va "plana": cada ubicación indica su parent_id y el frontend monta el árbol.
func NewLocationListResponse(rows []db.ListLocationsRow) []LocationResponse {
	out := make([]LocationResponse, len(rows))
	for i, r := range rows {
		out[i] = LocationResponse{
			ID:           UUIDString(r.ID),
			Name:         r.Name,
			Description:  r.Description.String,
			ParentID:     UUIDPtr(r.ParentID),
			ProductCount: r.ProductCount,
		}
	}
	return out
}
