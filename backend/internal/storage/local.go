package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// LocalStorage guarda los ficheros en una carpeta del servidor (UPLOAD_DIR).
type LocalStorage struct {
	root string
}

func NewLocalStorage(root string) (*LocalStorage, error) {
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(abs, 0o755); err != nil {
		return nil, fmt.Errorf("no se pudo crear la carpeta de subidas %q: %w", abs, err)
	}
	return &LocalStorage{root: abs}, nil
}

// path convierte una clave ("proyecto/producto/foto.jpg") en una ruta dentro de root.
// Rechaza cualquier clave que intente salirse de la carpeta (p. ej. "../../etc/passwd").
func (s *LocalStorage) path(key string) (string, error) {
	p := filepath.Join(s.root, filepath.FromSlash(key))
	if !strings.HasPrefix(p, s.root+string(filepath.Separator)) {
		return "", fmt.Errorf("clave de fichero no válida: %q", key)
	}
	return p, nil
}

func (s *LocalStorage) Save(_ context.Context, key string, r io.Reader) error {
	p, err := s.path(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return err
	}
	// Escribimos en un temporal y luego renombramos: nunca queda una foto a medias
	tmp, err := os.CreateTemp(filepath.Dir(p), ".subida-*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name()) // no hace nada si ya se renombró
	if _, err := io.Copy(tmp, r); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), p)
}

func (s *LocalStorage) Open(_ context.Context, key string) (io.ReadCloser, error) {
	p, err := s.path(key)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(p)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, ErrNotFound
	}
	return f, err
}

func (s *LocalStorage) Delete(_ context.Context, key string) error {
	p, err := s.path(key)
	if err != nil {
		return err
	}
	err = os.Remove(p)
	if errors.Is(err, fs.ErrNotExist) {
		return nil // ya no estaba: objetivo cumplido
	}
	return err
}
