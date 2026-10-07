package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"

	"github.com/nishikyr/stockea/internal/auth"
	"github.com/nishikyr/stockea/internal/db"
	"github.com/nishikyr/stockea/internal/handlers"
)

func main() {
	_ = godotenv.Load()
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, mustEnv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("no se pudo conectar a la base de datos: %v", err)
	}
	defer pool.Close()

	tokens, err := auth.NewTokenManager(mustEnv("JWT_SECRET"))
	if err != nil {
		log.Fatal(err)
	}
	queries := db.New(pool)

	authHandler := &handlers.AuthHandler{
		Queries:      queries,
		Tokens:       tokens,
		SecureCookie: os.Getenv("APP_ENV") == "production",
	}

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	// Sin CORS: en local el frontend (Vite) redirigirá /api al backend con un proxy,
	// y en producción se servirán desde el mismo dominio.

	api := e.Group("/api")

	// Healthcheck: comprueba que la API y la BD responden
	api.GET("/health", func(c echo.Context) error {
		if err := pool.Ping(c.Request().Context()); err != nil {
			return c.JSON(http.StatusServiceUnavailable, map[string]string{"status": "db down"})
		}
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// ── Auth ──
	// Máximo 5 intentos seguidos por IP; luego se recupera 1 intento cada 12 s
	// (frena ataques de fuerza bruta). Burst es obligatorio: sin él, el límite
	// de <1 petición/segundo bloquearía todos los logins.
	loginLimiter := middleware.RateLimiter(middleware.NewRateLimiterMemoryStoreWithConfig(
		middleware.RateLimiterMemoryStoreConfig{Rate: rate.Limit(5.0 / 60), Burst: 5},
	))
	api.POST("/auth/login", authHandler.Login, loginLimiter)
	api.POST("/auth/logout", authHandler.Logout)

	// ── Rutas protegidas: todo lo que va aquí exige sesión ──
	protected := api.Group("", auth.RequireAuth(tokens))
	protected.GET("/auth/me", authHandler.Me)

	// Ejemplos de cómo se protegerán las rutas de proyectos (siguiente paso):
	//   admin := protected.Group("/admin", auth.RequireAdmin)
	//   project := protected.Group("/projects/:projectID")
	//   project.GET("/products", h.ListProducts, auth.RequireProjectRole(queries, db.ProjectRoleViewer))
	//   project.POST("/products", h.CreateProduct, auth.RequireProjectRole(queries, db.ProjectRoleEditor))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("falta la variable de entorno %s", key)
	}
	return v
}
