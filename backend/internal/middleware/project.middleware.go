package middleware

import (
	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/services"
)

// RequireProjectRole comprueba tu rol en el proyecto de la URL (:projectID).
//
//	minRole = viewer → basta con ser miembro
//	minRole = editor → hay que poder editar
//	minRole = admin  → solo el administrador
//
// Si pasa, deja el id del proyecto y tu rol en la petición (ver context.go).
func RequireProjectRole(projects *services.ProjectService, minRole string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			projectID, err := dto.ParseUUID(c.Param("projectID"))
			if err != nil {
				return services.ErrProjectNotFound
			}
			role, err := projects.RoleOf(c.Request().Context(), projectID, CurrentUser(c))
			if err != nil {
				return err
			}
			if !services.RoleAtLeast(role, minRole) {
				return services.ErrInsufficientRole
			}
			c.Set(keyProjectID, projectID)
			c.Set(keyProjectRole, role)
			return next(c)
		}
	}
}
