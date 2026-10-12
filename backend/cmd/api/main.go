package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	"github.com/nishikyr/stockea/internal/config"
	"github.com/nishikyr/stockea/internal/db"
	"github.com/nishikyr/stockea/internal/handlers"
	"github.com/nishikyr/stockea/internal/routes"
	"github.com/nishikyr/stockea/internal/services"
	"github.com/nishikyr/stockea/internal/storage"
	"github.com/nishikyr/stockea/internal/web"
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

	// Dónde se guardan las fotos. Para usar R2/S3 en el futuro, solo cambia esta línea.
	store, err := storage.NewLocalStorage(cfg.UploadDir)
	if err != nil {
		log.Fatal(err)
	}

	// Capa de datos → services → handlers
	queries := db.New(pool)
	authService := services.NewAuthService(queries)
	userService := services.NewUserService(pool, queries)
	projectService := services.NewProjectService(queries, store)
	categoryService := services.NewCategoryService(queries)
	locationService := services.NewLocationService(queries)
	productService := services.NewProductService(pool, queries, store)
	photoService := services.NewPhotoService(queries, store)
	movementService := services.NewMovementService(pool, queries)

	e := echo.New()
	e.HideBanner = true
	e.HTTPErrorHandler = handlers.ErrorHandler
	web.TrustProxy(e) // IP real del usuario detrás del proxy de Fly/Railway/Render
	e.Use(echomw.Logger())
	e.Use(echomw.Recover())
	web.SecurityHeaders(e, cfg.Production)
	// Sin CORS: en local Vite redirige /api al backend (proxy), y en producción el propio Go
	// sirve el frontend: todo sale del mismo dominio.
	if cfg.StaticDir != "" {
		web.ServeFrontend(e, cfg.StaticDir)
	}

	routes.Register(e, routes.Deps{
		AuthService:    authService,
		ProjectService: projectService,
		Health:         &handlers.HealthHandler{DB: pool},
		Auth:           &handlers.AuthHandler{Auth: authService, Users: userService, SecureCookie: cfg.Production},
		Users:          &handlers.UserHandler{Users: userService},
		Projects:       &handlers.ProjectHandler{Projects: projectService},
		Categories:     &handlers.CategoryHandler{Categories: categoryService},
		Locations:      &handlers.LocationHandler{Locations: locationService},
		Products:       &handlers.ProductHandler{Products: productService, Photos: photoService},
		Movements:      &handlers.MovementHandler{Movements: movementService},
		Photos:         &handlers.PhotoHandler{Photos: photoService},
	})

	// Arrancamos el servidor en segundo plano…
	go func() {
		if err := e.Start(":" + cfg.Port); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("el servidor se ha parado: %v", err)
		}
	}()

	// …y esperamos a que el sistema nos pida parar (Ctrl+C en local, o SIGTERM cuando
	// la plataforma despliega una versión nueva). "Apagado elegante": dejamos terminar
	// las peticiones que estaban a medias (p. ej. una foto subiéndose) antes de cerrar.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()
	log.Println("apagando: terminando las peticiones en curso…")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(shutdownCtx); err != nil {
		log.Printf("apagado forzoso: %v", err)
	}
}
