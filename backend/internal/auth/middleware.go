package auth

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/db"
)

const (
	ctxClaims = "claims"
	ctxRole   = "projectRole"
)

// RequireAuth deja pasar solo a usuarios con una cookie de sesión válida.
func RequireAuth(tm *TokenManager) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			cookie, err := c.Cookie(CookieName)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "no has iniciado sesión")
			}
			claims, err := tm.Parse(cookie.Value)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "sesión no válida o caducada")
			}
			c.Set(ctxClaims, claims)
			return next(c)
		}
	}
}

// RequireAdmin: solo el administrador global. Va siempre después de RequireAuth.
func RequireAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !CurrentClaims(c).IsAdmin {
			return echo.NewHTTPError(http.StatusForbidden, "solo el administrador puede hacer esto")
		}
		return next(c)
	}
}

// RequireProjectRole comprueba el rol del usuario en el proyecto de la URL (:projectID).
// minRole = viewer → basta con ser miembro; minRole = editor → hay que ser editor.
// El admin global siempre pasa.
func RequireProjectRole(q *db.Queries, minRole db.ProjectRole) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			claims := CurrentClaims(c)
			if claims.IsAdmin {
				c.Set(ctxRole, db.ProjectRoleEditor)
				return next(c)
			}

			var projectID, userID pgtype.UUID
			if err := projectID.Scan(c.Param("projectID")); err != nil {
				return echo.NewHTTPError(http.StatusBadRequest, "id de proyecto no válido")
			}
			if err := userID.Scan(claims.UserID); err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "sesión no válida")
			}

			role, err := q.GetProjectRole(c.Request().Context(), db.GetProjectRoleParams{
				ProjectID: projectID,
				UserID:    userID,
			})
			if errors.Is(err, pgx.ErrNoRows) {
				// 404 en vez de 403: no revelamos que el proyecto existe
				return echo.NewHTTPError(http.StatusNotFound, "proyecto no encontrado")
			}
			if err != nil {
				return err
			}
			if minRole == db.ProjectRoleEditor && role != db.ProjectRoleEditor {
				return echo.NewHTTPError(http.StatusForbidden, "solo puedes consultar este proyecto")
			}

			c.Set(ctxRole, role)
			return next(c)
		}
	}
}

// CurrentClaims devuelve los datos del usuario logueado (tras RequireAuth).
func CurrentClaims(c echo.Context) *Claims {
	claims, _ := c.Get(ctxClaims).(*Claims)
	return claims
}
