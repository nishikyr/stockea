// Package storage guarda los ficheros (las fotos) fuera de la base de datos.
//
// El resto de la app solo conoce la interfaz Storage. Hay dos implementaciones:
//   - LocalStorage: una carpeta en el disco (desarrollo, en tu ordenador).
//   - S3Storage: cualquier almacenamiento compatible con S3 (producción: Neon, R2, AWS…).
//
// main.go elige una u otra según las variables de entorno; el resto del código no se entera.
package storage

import (
	"context"
	"errors"
	"io"
)

var ErrNotFound = errors.New("fichero no encontrado")

type Storage interface {
	// Save guarda el fichero. size = nº de bytes; contentType = "image/jpeg", etc.
	Save(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	Open(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
}
