package services

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/db"
	"github.com/nishikyr/stockea/internal/storage"
)

const (
	MaxPhotoBytes       = 10 << 20 // 10 MB por foto
	maxPhotosPerProduct = 10
)

// Solo aceptamos estos formatos. El tipo se detecta mirando los primeros bytes del
// fichero, no fiándonos del nombre ni de lo que diga el navegador.
var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

type PhotoService struct {
	q     *db.Queries
	store storage.Storage
}

func NewPhotoService(q *db.Queries, store storage.Storage) *PhotoService {
	return &PhotoService{q: q, store: store}
}

func (s *PhotoService) List(ctx context.Context, projectID, productID pgtype.UUID) ([]db.ProductPhoto, error) {
	if err := s.checkProduct(ctx, projectID, productID); err != nil {
		return nil, err
	}
	return s.q.ListProductPhotos(ctx, productID)
}

// Upload valida la imagen, la guarda en el almacenamiento y la registra en la BD.
func (s *PhotoService) Upload(ctx context.Context, projectID, productID pgtype.UUID, r io.Reader) (db.ProductPhoto, error) {
	if err := s.checkProduct(ctx, projectID, productID); err != nil {
		return db.ProductPhoto{}, err
	}
	count, err := s.q.CountProductPhotos(ctx, productID)
	if err != nil {
		return db.ProductPhoto{}, err
	}
	if count >= maxPhotosPerProduct {
		return db.ProductPhoto{}, validation("este producto ya tiene el máximo de 10 fotos")
	}

	// Miramos los primeros 512 bytes para saber qué es de verdad
	br := bufio.NewReaderSize(r, 512)
	head, _ := br.Peek(512)
	ext, ok := allowedImageTypes[http.DetectContentType(head)]
	if !ok {
		return db.ProductPhoto{}, validation("solo se admiten fotos JPG, PNG o WEBP")
	}

	name := make([]byte, 16)
	if _, err := rand.Read(name); err != nil {
		return db.ProductPhoto{}, err
	}
	// La clave incluye proyecto y producto: fácil de ordenar y de borrar
	key := uuidHex(projectID) + "/" + uuidHex(productID) + "/" + hex.EncodeToString(name) + ext

	// Límite de tamaño: si el fichero pasa de 10 MB, el lector corta y damos error
	limited := &io.LimitedReader{R: br, N: MaxPhotoBytes + 1}
	if err := s.store.Save(ctx, key, limited); err != nil {
		return db.ProductPhoto{}, err
	}
	if limited.N == 0 {
		_ = s.store.Delete(ctx, key)
		return db.ProductPhoto{}, validation("la foto no puede superar 10 MB")
	}

	photo, err := s.q.CreateProductPhoto(ctx, db.CreateProductPhotoParams{
		ProductID:  productID,
		StorageKey: key,
		Position:   count,
	})
	if err != nil {
		_ = s.store.Delete(ctx, key) // no dejamos ficheros huérfanos
		return db.ProductPhoto{}, err
	}
	return photo, nil
}

// Open devuelve el fichero de la foto para enviarlo al navegador.
func (s *PhotoService) Open(ctx context.Context, projectID, productID, photoID pgtype.UUID) (io.ReadCloser, string, error) {
	photo, err := s.get(ctx, projectID, productID, photoID)
	if err != nil {
		return nil, "", err
	}
	f, err := s.store.Open(ctx, photo.StorageKey)
	if errors.Is(err, storage.ErrNotFound) {
		return nil, "", ErrPhotoNotFound
	}
	if err != nil {
		return nil, "", err
	}
	return f, contentTypeFromKey(photo.StorageKey), nil
}

func (s *PhotoService) Delete(ctx context.Context, projectID, productID, photoID pgtype.UUID) error {
	photo, err := s.get(ctx, projectID, productID, photoID)
	if err != nil {
		return err
	}
	if err := s.q.DeleteProductPhoto(ctx, photo.ID); err != nil {
		return err
	}
	_ = s.store.Delete(ctx, photo.StorageKey) // si falla, solo queda un fichero sin usar
	return nil
}

func (s *PhotoService) get(ctx context.Context, projectID, productID, photoID pgtype.UUID) (db.ProductPhoto, error) {
	photo, err := s.q.GetProductPhoto(ctx, db.GetProductPhotoParams{ProjectID: projectID, ProductID: productID, ID: photoID})
	if errors.Is(err, pgx.ErrNoRows) {
		return db.ProductPhoto{}, ErrPhotoNotFound
	}
	return photo, err
}

func (s *PhotoService) checkProduct(ctx context.Context, projectID, productID pgtype.UUID) error {
	_, err := s.q.GetProductDetail(ctx, db.GetProductDetailParams{ProjectID: projectID, ID: productID})
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrProductNotFound
	}
	return err
}

func contentTypeFromKey(key string) string {
	for ct, ext := range allowedImageTypes {
		if len(key) > len(ext) && key[len(key)-len(ext):] == ext {
			return ct
		}
	}
	return "application/octet-stream"
}

func uuidHex(u pgtype.UUID) string {
	return hex.EncodeToString(u.Bytes[:])
}
