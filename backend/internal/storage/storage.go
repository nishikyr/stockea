// Package storage guarda los ficheros (las fotos) fuera de la base de datos.
//
// El resto de la app solo conoce la interfaz Storage. Hoy usamos LocalStorage
// (carpeta en el disco del servidor); mañana se puede añadir un R2Storage o S3Storage
// que cumpla la misma interfaz y basta con cambiar una línea en main.go.
package storage

import (
	"context"
	"errors"
	"io"
)

var ErrNotFound = errors.New("fichero no encontrado")

type Storage interface {
	Save(ctx context.Context, key string, r io.Reader) error
	Open(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
}
