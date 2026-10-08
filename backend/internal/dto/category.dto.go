package dto

import "github.com/nishikyr/stockea/internal/db"

type CategoryRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"` // "#rrggbb" (opcional)
	Icon  string `json:"icon"`  // opcional
}

type CategoryResponse struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Color        string `json:"color"`
	Icon         string `json:"icon"`
	ProductCount int32  `json:"product_count"`
}

func NewCategoryResponse(c db.Category) CategoryResponse {
	return CategoryResponse{ID: UUIDString(c.ID), Name: c.Name, Color: c.Color, Icon: c.Icon.String}
}

func NewCategoryListResponse(rows []db.ListCategoriesRow) []CategoryResponse {
	out := make([]CategoryResponse, len(rows))
	for i, r := range rows {
		out[i] = CategoryResponse{
			ID:           UUIDString(r.ID),
			Name:         r.Name,
			Color:        r.Color,
			Icon:         r.Icon.String,
			ProductCount: r.ProductCount,
		}
	}
	return out
}
