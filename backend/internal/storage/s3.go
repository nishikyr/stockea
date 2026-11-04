package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// S3Config son los datos para conectarse a un almacenamiento compatible con S3.
// S3 es la API de almacenamiento de Amazon; se ha convertido en un estándar y la hablan
// Neon Object Storage, Cloudflare R2, MinIO, Backblaze… Cambiar de proveedor = cambiar estas variables.
type S3Config struct {
	Endpoint  string // URL completa, p. ej. https://br-xxx.storage.c-7.eu-central-1.aws.neon.tech
	Region    string // p. ej. eu-central-1
	Bucket    string // p. ej. stockea-photos
	AccessKey string // el "usuario" de la credencial (en Neon empieza por nak_live_)
	SecretKey string // la "contraseña" (en Neon empieza por nsk_live_). ¡Nunca en el código!
}

// S3Storage guarda las fotos en un bucket S3 (privado: solo las sirve nuestra API).
type S3Storage struct {
	client *minio.Client
	bucket string
}

func NewS3Storage(cfg S3Config) (*S3Storage, error) {
	u, err := url.Parse(cfg.Endpoint)
	if err != nil || u.Host == "" {
		return nil, fmt.Errorf("S3_ENDPOINT no es una URL válida: %q", cfg.Endpoint)
	}
	client, err := minio.New(u.Host, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: u.Scheme != "http", // HTTPS siempre, salvo un servidor de pruebas local
		Region: cfg.Region,
		// "Path style": https://endpoint/bucket/foto.jpg (en vez de https://bucket.endpoint/foto.jpg).
		// Neon solo admite este estilo; R2 y AWS admiten los dos.
		BucketLookup: minio.BucketLookupPath,
	})
	if err != nil {
		return nil, err
	}
	return &S3Storage{client: client, bucket: cfg.Bucket}, nil
}

func (s *S3Storage) Save(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, r, size, minio.PutObjectOptions{ContentType: contentType})
	return err
}

func (s *S3Storage) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	// GetObject es "perezoso": no pregunta nada hasta que lees. Stat() hace la petición ya,
	// para poder responder 404 si la foto no existe en vez de fallar a mitad de la descarga.
	if _, err := obj.Stat(); err != nil {
		obj.Close()
		if minio.ToErrorResponse(err).Code == "NoSuchKey" {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return obj, nil
}

func (s *S3Storage) Delete(ctx context.Context, key string) error {
	err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
	if minio.ToErrorResponse(err).Code == "NoSuchKey" {
		return nil // ya no estaba: objetivo cumplido
	}
	return err
}

// Check comprueba al arrancar que el bucket existe y las credenciales valen,
// para enterarnos en el despliegue y no cuando alguien intente subir una foto.
func (s *S3Storage) Check(ctx context.Context) error {
	ok, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("no se pudo conectar al almacenamiento S3: %w", err)
	}
	if !ok {
		return errors.New("el bucket " + s.bucket + " no existe")
	}
	return nil
}
