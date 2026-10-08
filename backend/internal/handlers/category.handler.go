package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/middleware"
	"github.com/nishikyr/stockea/internal/services"
)

type CategoryHandler struct {
	Categories *services.CategoryService
}

// GET /api/projects/:projectID/categories
func (h *CategoryHandler) List(c echo.Context) error {
	rows, err := h.Categories.List(c.Request().Context(), middleware.ProjectID(c))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewCategoryListResponse(rows))
}

// POST /api/projects/:projectID/categories
func (h *CategoryHandler) Create(c echo.Context) error {
	var req dto.CategoryRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	cat, err := h.Categories.Create(c.Request().Context(), middleware.ProjectID(c), toCategoryInput(req))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, dto.NewCategoryResponse(cat))
}

// PUT /api/projects/:projectID/categories/:categoryID
func (h *CategoryHandler) Update(c echo.Context) error {
	id, err := pathUUID(c, "categoryID", services.ErrCategoryNotFound)
	if err != nil {
		return err
	}
	var req dto.CategoryRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	cat, err := h.Categories.Update(c.Request().Context(), middleware.ProjectID(c), id, toCategoryInput(req))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewCategoryResponse(cat))
}

// DELETE /api/projects/:projectID/categories/:categoryID
func (h *CategoryHandler) Delete(c echo.Context) error {
	id, err := pathUUID(c, "categoryID", services.ErrCategoryNotFound)
	if err != nil {
		return err
	}
	if err := h.Categories.Delete(c.Request().Context(), middleware.ProjectID(c), id); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func toCategoryInput(req dto.CategoryRequest) services.CategoryInput {
	return services.CategoryInput{Name: req.Name, Color: req.Color, Icon: req.Icon}
}
