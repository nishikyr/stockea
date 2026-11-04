-- +goose Up
-- Tamaño de cada foto en bytes. Con él la app sabe cuánto espacio llevan ocupado TODAS las fotos
-- y puede negarse a subir más antes de llegar al límite del almacenamiento (freno de costes).
-- Las fotos que ya existían quedan con 0 (en producción aún no hay ninguna).
ALTER TABLE product_photos ADD COLUMN size_bytes BIGINT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE product_photos DROP COLUMN size_bytes;
