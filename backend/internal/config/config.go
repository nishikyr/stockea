// Package config lee y valida la configuración (.env) en un solo sitio.
package config

import (
	"errors"
	"os"
	"strconv"

	"github.com/nishikyr/stockea/internal/storage"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Port        string
	Production  bool   // APP_ENV=production → cookies solo por HTTPS
	UploadDir   string // carpeta donde se guardan las fotos
	StaticDir   string // carpeta con el frontend compilado (frontend/dist); vacío = no se sirve

	// Almacenamiento de fotos: si S3_BUCKET tiene valor se usa S3 (producción);
	// si no, la carpeta UploadDir (desarrollo).
	S3 storage.S3Config
	// Espacio máximo para todas las fotos, en MB (PHOTO_QUOTA_MB). Por defecto 4096 = 4 GB:
	// deja 1 GB de margen sobre los 5 GB gratis de Neon.
	PhotoQuotaMB int64
}

// UseS3 dice si las fotos van a un almacenamiento S3 en vez de al disco.
func (c Config) UseS3() bool { return c.S3.Bucket != "" }

func Load() (Config, error) {
	_ = godotenv.Load() // en producción no hay .env: las variables vienen del servidor

	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        os.Getenv("PORT"),
		Production:  os.Getenv("APP_ENV") == "production",
		UploadDir:   os.Getenv("UPLOAD_DIR"),
		StaticDir:   os.Getenv("STATIC_DIR"),
		S3: storage.S3Config{
			Endpoint:  os.Getenv("S3_ENDPOINT"),
			Region:    os.Getenv("S3_REGION"),
			Bucket:    os.Getenv("S3_BUCKET"),
			AccessKey: os.Getenv("S3_ACCESS_KEY_ID"),
			SecretKey: os.Getenv("S3_SECRET_ACCESS_KEY"),
		},
		PhotoQuotaMB: 4096,
	}
	if v := os.Getenv("PHOTO_QUOTA_MB"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n <= 0 {
			return cfg, errors.New("PHOTO_QUOTA_MB debe ser un número de megas mayor que 0")
		}
		cfg.PhotoQuotaMB = n
	}
	if cfg.UseS3() && (cfg.S3.Endpoint == "" || cfg.S3.AccessKey == "" || cfg.S3.SecretKey == "") {
		return cfg, errors.New("con S3_BUCKET también hacen falta S3_ENDPOINT, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY")
	}
	if cfg.UploadDir == "" {
		cfg.UploadDir = "./uploads"
	}
	if cfg.DatabaseURL == "" {
		return cfg, errors.New("falta la variable de entorno DATABASE_URL")
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	return cfg, nil
}
