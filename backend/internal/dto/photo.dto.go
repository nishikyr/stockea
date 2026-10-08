package dto

import (
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/db"
)

type PhotoResponse struct {
	ID  string `json:"id"`
	URL string `json:"url"` // úsala tal cual en <img src="...">
}

// PhotoURL: la dirección desde la que el navegador descarga la foto.
// Pasa por la API (no es un enlace público), así que solo la ven los miembros del proyecto.
func PhotoURL(projectID, productID, photoID pgtype.UUID) string {
	return "/api/projects/" + UUIDString(projectID) + "/products/" + UUIDString(productID) + "/photos/" + UUIDString(photoID)
}

func NewPhotoResponse(projectID pgtype.UUID, ph db.ProductPhoto) PhotoResponse {
	return PhotoResponse{ID: UUIDString(ph.ID), URL: PhotoURL(projectID, ph.ProductID, ph.ID)}
}

func NewPhotoListResponse(projectID pgtype.UUID, photos []db.ProductPhoto) []PhotoResponse {
	out := make([]PhotoResponse, len(photos))
	for i, ph := range photos {
		out[i] = NewPhotoResponse(projectID, ph)
	}
	return out
}
