package main

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	"github.com/nishikyr/stockea/internal/config"
	"github.com/nishikyr/stockea/internal/db"
	"github.com/nishikyr/stockea/internal/handlers"
	"github.com/nishikyr/stockea/internal/routes"
	"github.com/nishikyr/stockea/internal/services"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("no se pudo conectar a la base de datos: %v", err)
	}
	defer pool.Close()

	// Capa de datos → services → handlers
	queries := db.New(pool)
	authService := services.NewAuthService(queries)
	userService := services.NewUserService(queries)
	projectService := services.NewProjectService(queries)

	e := echo.New()
	e.HTTPErrorHandler = handlers.ErrorHandler
	e.Use(echomw.Logger())
	e.Use(echomw.Recover())
	// Sin CORS: en local el frontend (Vite) redirigirá /api al backend con un proxy,
	// y en producción se servirán desde el mismo dominio.

	routes.Register(e, routes.Deps{
		AuthService:    authService,
		ProjectService: projectService,
		Health:         &handlers.HealthHandler{DB: pool},
		Auth:           &handlers.AuthHandler{Auth: authService, SecureCookie: cfg.Production},
		Users:          &handlers.UserHandler{Users: userService},
		Projects:       &handlers.ProjectHandler{Projects: projectService},
	})

	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
