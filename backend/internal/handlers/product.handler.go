package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/middleware"
	"github.com/nishikyr/stockea/internal/services"
)

type ProductHandler struct {
	Products *services.ProductService
	Photos   *services.PhotoService
}

// GET /api/projects/:projectID/products?category_id=&location_id=&q=&low_stock=true
func (h *ProductHandler) List(c echo.Context) error {
	categoryID, err := queryUUID(c, "category_id")
	if err != nil {
		return err
	}
	locationID, err := queryUUID(c, "location_id")
	if err != nil {
		return err
	}
	rows, err := h.Products.List(c.Request().Context(), middleware.ProjectID(c), services.ProductFilter{
		CategoryID:   categoryID,
		LocationID:   locationID,
		Search:       c.QueryParam("q"),
		LowStockOnly: c.QueryParam("low_stock") == "true",
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewProductListResponse(rows))
}

// GET /api/projects/:projectID/products/:productID
func (h *ProductHandler) Get(c echo.Context) error {
	id, err := pathUUID(c, "productID", services.ErrProductNotFound)
	if err != nil {
		return err
	}
	ctx, projectID := c.Request().Context(), middleware.ProjectID(c)
	p, err := h.Products.Get(ctx, projectID, id)
	if err != nil {
		return err
	}
	photos, err := h.Photos.List(ctx, projectID, id)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewProductDetailResponse(p, photos))
}

// POST /api/projects/:projectID/products
func (h *ProductHandler) Create(c echo.Context) error {
	var req dto.CreateProductRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	in, err := toProductInput(req.ProductRequest)
	if err != nil {
		return err
	}
	p, err := h.Products.Create(c.Request().Context(), middleware.ProjectID(c), middleware.CurrentUser(c), in, req.Quantity)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, dto.NewProductResponse(p))
}

// PUT /api/projects/:projectID/products/:productID — edita los datos (no la cantidad)
func (h *ProductHandler) Update(c echo.Context) error {
	id, err := pathUUID(c, "productID", services.ErrProductNotFound)
	if err != nil {
		return err
	}
	var req dto.ProductRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	in, err := toProductInput(req)
	if err != nil {
		return err
	}
	p, err := h.Products.Update(c.Request().Context(), middleware.ProjectID(c), id, in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewProductResponse(p))
}

// DELETE /api/projects/:projectID/products/:productID
func (h *ProductHandler) Delete(c echo.Context) error {
	id, err := pathUUID(c, "productID", services.ErrProductNotFound)
	if err != nil {
		return err
	}
	if err := h.Products.Delete(c.Request().Context(), middleware.ProjectID(c), id); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func toProductInput(req dto.ProductRequest) (services.ProductInput, error) {
	categoryID, err := bodyUUID(req.CategoryID, services.ErrCategoryNotFound)
	if err != nil {
		return services.ProductInput{}, err
	}
	locationID, err := bodyUUID(req.LocationID, services.ErrLocationNotFound)
	if err != nil {
		return services.ProductInput{}, err
	}
	return services.ProductInput{
		Name:        req.Name,
		Description: req.Description,
		CategoryID:  categoryID,
		LocationID:  locationID,
		Unit:        req.Unit,
		MinQuantity: req.MinQuantity,
	}, nil
}
