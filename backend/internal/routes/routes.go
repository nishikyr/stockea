// Package routes reúne todas las rutas de la API en un solo sitio.
package routes

import (
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"

	"github.com/nishikyr/stockea/internal/handlers"
	mw "github.com/nishikyr/stockea/internal/middleware"
	"github.com/nishikyr/stockea/internal/services"
)

type Deps struct {
	AuthService    *services.AuthService
	ProjectService *services.ProjectService

	Health   *handlers.HealthHandler
	Auth     *handlers.AuthHandler
	Users    *handlers.UserHandler
	Projects *handlers.ProjectHandler
}

func Register(e *echo.Echo, d Deps) {
	requireAuth := mw.RequireAuth(d.AuthService)
	viewer := mw.RequireProjectRole(d.ProjectService, services.RoleViewer)
	admin := mw.RequireProjectRole(d.ProjectService, services.RoleAdmin)

	// Máximo 5 intentos de login seguidos por IP; luego 1 intento cada 12 s.
	// Burst es obligatorio: sin él, un límite de <1 petición/s bloquearía todos los logins.
	loginLimiter := echomw.RateLimiter(echomw.NewRateLimiterMemoryStoreWithConfig(
		echomw.RateLimiterMemoryStoreConfig{Rate: rate.Limit(5.0 / 60), Burst: 5},
	))

	api := e.Group("/api")
	api.GET("/health", d.Health.Check)

	// ── Auth ──
	authGroup := api.Group("/auth")
	authGroup.POST("/login", d.Auth.Login, loginLimiter)
	authGroup.POST("/logout", d.Auth.Logout)
	authGroup.GET("/me", d.Auth.Me, requireAuth)

	// ── Usuarios (solo admin) ──
	users := api.Group("/users", requireAuth, mw.RequireAdmin)
	users.GET("", d.Users.List)
	users.POST("", d.Users.Create)

	// ── Proyectos ──
	projects := api.Group("/projects", requireAuth)
	projects.GET("", d.Projects.List)
	projects.POST("", d.Projects.Create, mw.RequireAdmin)

	project := projects.Group("/:projectID")
	project.GET("", d.Projects.Get, viewer)

	members := project.Group("/members", admin)
	members.GET("", d.Projects.ListMembers)
	members.PUT("", d.Projects.SetMember)
	members.DELETE("/:userID", d.Projects.RemoveMember)

	// Siguiente paso: categorías, productos y movimientos colgando de `project`
	// (lectura con `viewer`, escritura con un middleware de rol "editor").
}
