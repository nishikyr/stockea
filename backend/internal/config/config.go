// Package config lee y valida la configuración (.env) en un solo sitio.
package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Port        string
	Production  bool // APP_ENV=production → cookies solo por HTTPS
}

func Load() (Config, error) {
	_ = godotenv.Load() // en producción no hay .env: las variables vienen del servidor

	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        os.Getenv("PORT"),
		Production:  os.Getenv("APP_ENV") == "production",
	}
	if cfg.DatabaseURL == "" {
		return cfg, errors.New("falta la variable de entorno DATABASE_URL")
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	return cfg, nil
}
