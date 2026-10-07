package handlers

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v4"
)

type Pinger interface {
	Ping(ctx context.Context) error
}

type HealthHandler struct {
	DB Pinger
}

// GET /api/health — comprueba que la API y la base de datos responden
func (h *HealthHandler) Check(c echo.Context) error {
	if err := h.DB.Ping(c.Request().Context()); err != nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"status": "db down"})
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
