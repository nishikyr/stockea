package handlers

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/services"
)

var kindToStatus = map[services.Kind]int{
	services.KindValidation:   http.StatusBadRequest,
	services.KindUnauthorized: http.StatusUnauthorized,
	services.KindForbidden:    http.StatusForbidden,
	services.KindNotFound:     http.StatusNotFound,
	services.KindConflict:     http.StatusConflict,
}

// ErrorHandler convierte cualquier error en una respuesta JSON {"message": "..."}.
// Así los handlers solo hacen `return err` y aquí se decide el código HTTP.
func ErrorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}

	status := http.StatusInternalServerError
	message := "error interno del servidor"

	var appErr *services.Error
	var httpErr *echo.HTTPError
	switch {
	case errors.As(err, &appErr):
		status, message = kindToStatus[appErr.Kind], appErr.Message
	case errors.As(err, &httpErr): // p. ej. ruta no encontrada (404) o límite de intentos (429)
		status, message = httpErr.Code, fmt.Sprint(httpErr.Message)
	default:
		c.Logger().Error(err) // error inesperado: se registra, pero no se enseña al cliente
	}

	_ = c.JSON(status, map[string]string{"message": message})
}
