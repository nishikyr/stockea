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
	Health     *handlers.HealthHandler
	Auth       *handlers.AuthHandler
	Users      *handlers.UserHandler
	Projects   *handlers.ProjectHandler
	Categories *handlers.CategoryHandler
	Locations  *handlers.LocationHandler
	Products   *handlers.ProductHandler
	Movements  *handlers.MovementHandler
}

func Register(e *echo.Echo, d Deps) {
	requireAuth := mw.RequireAuth(d.AuthService)

	// Permisos dentro de un proyecto
	viewer := mw.RequireProjectRole(d.ProjectService, services.RoleViewer) // leer
	editor := mw.RequireProjectRole(d.ProjectService, services.RoleEditor) // modificar inventario
	admin := mw.RequireProjectRole(d.ProjectService, services.RoleAdmin)   // gestionar miembros

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

	// ── Inventario: leer = cualquier miembro, modificar = editor o admin ──
	categories := project.Group("/categories")
	categories.GET("", d.Categories.List, viewer)
	categories.POST("", d.Categories.Create, editor)
	categories.PUT("/:categoryID", d.Categories.Update, editor)
	categories.DELETE("/:categoryID", d.Categories.Delete, editor)

	locations := project.Group("/locations")
	locations.GET("", d.Locations.List, viewer)
	locations.POST("", d.Locations.Create, editor)
	locations.PUT("/:locationID", d.Locations.Update, editor)
	locations.DELETE("/:locationID", d.Locations.Delete, editor)

	products := project.Group("/products")
	products.GET("", d.Products.List, viewer)
	products.POST("", d.Products.Create, editor)
	products.GET("/:productID", d.Products.Get, viewer)
	products.PUT("/:productID", d.Products.Update, editor)
	products.DELETE("/:productID", d.Products.Delete, editor)
	products.POST("/:productID/movements", d.Movements.Register, editor)

	project.GET("/movements", d.Movements.List, viewer)
}
