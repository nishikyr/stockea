package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/middleware"
	"github.com/nishikyr/stockea/internal/services"
)

type PhotoHandler struct {
	Photos *services.PhotoService
}

// POST /api/projects/:projectID/products/:productID/photos
// Formulario multipart con un campo "photo" (lo que manda un <input type="file">).
func (h *PhotoHandler) Upload(c echo.Context) error {
	productID, err := pathUUID(c, "productID", services.ErrProductNotFound)
	if err != nil {
		return err
	}
	fileHeader, err := c.FormFile("photo")
	if err != nil {
		return &services.Error{Kind: services.KindValidation, Message: `falta la foto (campo "photo")`}
	}
	file, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer file.Close()

	projectID := middleware.ProjectID(c)
	photo, err := h.Photos.Upload(c.Request().Context(), projectID, productID, file)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, dto.NewPhotoResponse(projectID, photo))
}

// GET /api/projects/:projectID/products/:productID/photos/:photoID — devuelve la imagen
func (h *PhotoHandler) Serve(c echo.Context) error {
	productID, err := pathUUID(c, "productID", services.ErrProductNotFound)
	if err != nil {
		return err
	}
	photoID, err := pathUUID(c, "photoID", services.ErrPhotoNotFound)
	if err != nil {
		return err
	}
	f, contentType, err := h.Photos.Open(c.Request().Context(), middleware.ProjectID(c), productID, photoID)
	if err != nil {
		return err
	}
	defer f.Close()

	// Una foto nunca cambia (si cambias la foto, es otra con otro id): el navegador puede guardarla.
	// "private": solo el navegador de quien la ve, nunca cachés intermedias.
	c.Response().Header().Set("Cache-Control", "private, max-age=604800, immutable")
	c.Response().Header().Set("X-Content-Type-Options", "nosniff")
	return c.Stream(http.StatusOK, contentType, f)
}

// DELETE /api/projects/:projectID/products/:productID/photos/:photoID
func (h *PhotoHandler) Delete(c echo.Context) error {
	productID, err := pathUUID(c, "productID", services.ErrProductNotFound)
	if err != nil {
		return err
	}
	photoID, err := pathUUID(c, "photoID", services.ErrPhotoNotFound)
	if err != nil {
		return err
	}
	if err := h.Photos.Delete(c.Request().Context(), middleware.ProjectID(c), productID, photoID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
