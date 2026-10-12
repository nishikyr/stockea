-- +goose Up
-- Cuentas desactivadas. Una persona con historial no se puede borrar (sus movimientos dicen
-- "quién lo hizo"), así que en vez de borrarla la desactivamos: no puede entrar, pero su nombre
-- sigue apareciendo en el historial. NULL = activa; una fecha = desactivada desde ese momento.
ALTER TABLE users ADD COLUMN disabled_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE users DROP COLUMN disabled_at;
