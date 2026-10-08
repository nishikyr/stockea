package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/middleware"
	"github.com/nishikyr/stockea/internal/services"
)

type MovementHandler struct {
	Movements *services.MovementService
}

// POST /api/projects/:projectID/products/:productID/movements
func (h *MovementHandler) Register(c echo.Context) error {
	productID, err := pathUUID(c, "productID", services.ErrProductNotFound)
	if err != nil {
		return err
	}
	var req dto.MovementRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	user := middleware.CurrentUser(c)
	res, err := h.Movements.Register(c.Request().Context(), middleware.ProjectID(c), productID, user, services.MovementInput{
		Type:     req.Type,
		Quantity: req.Quantity,
		Reason:   req.Reason,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, dto.NewRegisterMovementResponse(res.Movement, res.Product, user))
}

// POST /api/projects/:projectID/movements/batch — varias cosas a la vez, todo o nada
func (h *MovementHandler) RegisterBatch(c echo.Context) error {
	var req dto.BatchMovementRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	items := make([]services.BatchItem, len(req.Items))
	for i, it := range req.Items {
		id, err := dto.ParseUUID(it.ProductID)
		if err != nil {
			return services.ErrProductNotFound
		}
		items[i] = services.BatchItem{ProductID: id, Quantity: it.Quantity}
	}
	user := middleware.CurrentUser(c)
	results, err := h.Movements.RegisterBatch(c.Request().Context(), middleware.ProjectID(c), user, services.BatchInput{
		Type:   req.Type,
		Reason: req.Reason,
		Items:  items,
	})
	if err != nil {
		return err
	}
	out := make([]dto.RegisterMovementResponse, len(results))
	for i, r := range results {
		out[i] = dto.NewRegisterMovementResponse(r.Movement, r.Product, user)
	}
	return c.JSON(http.StatusCreated, out)
}

// GET /api/projects/:projectID/movements?product_id=&type=out&limit=50&offset=0
func (h *MovementHandler) List(c echo.Context) error {
	productID, err := queryUUID(c, "product_id")
	if err != nil {
		return err
	}
	rows, err := h.Movements.List(c.Request().Context(), middleware.ProjectID(c), services.MovementFilter{
		ProductID: productID,
		Type:      c.QueryParam("type"),
		Limit:     queryInt(c, "limit", 50),
		Offset:    queryInt(c, "offset", 0),
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewMovementListResponse(rows))
}
