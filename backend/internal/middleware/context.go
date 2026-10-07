package middleware

import (
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/db"
)

// Claves con las que los middlewares guardan datos en la petición.
const (
	keyUser        = "currentUser"
	keyProjectID   = "projectID"
	keyProjectRole = "projectRole"
)

// CurrentUser: el usuario logueado (disponible tras RequireAuth).
func CurrentUser(c echo.Context) db.User {
	u, _ := c.Get(keyUser).(db.User)
	return u
}

// ProjectID: el proyecto de la URL ya validado (tras RequireProjectRole).
func ProjectID(c echo.Context) pgtype.UUID {
	id, _ := c.Get(keyProjectID).(pgtype.UUID)
	return id
}

// ProjectRole: tu rol en ese proyecto (tras RequireProjectRole).
func ProjectRole(c echo.Context) string {
	r, _ := c.Get(keyProjectRole).(string)
	return r
}
