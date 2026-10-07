package middleware

import (
	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/auth"
	"github.com/nishikyr/stockea/internal/services"
)

// RequireAuth deja pasar solo a usuarios con una sesión válida en la BD.
func RequireAuth(authService *services.AuthService) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			cookie, err := c.Cookie(auth.CookieName)
			if err != nil || cookie.Value == "" {
				return services.ErrNotLoggedIn
			}
			user, err := authService.UserFromToken(c.Request().Context(), cookie.Value)
			if err != nil {
				return err
			}
			c.Set(keyUser, user)
			return next(c)
		}
	}
}

// RequireAdmin: solo el administrador global. Va siempre después de RequireAuth.
func RequireAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !CurrentUser(c).IsAdmin {
			return services.ErrAdminOnly
		}
		return next(c)
	}
}
