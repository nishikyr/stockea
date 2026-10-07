-- +goose Up
-- Sesiones guardadas en el servidor.
-- La cookie del navegador lleva un token aleatorio; aquí solo guardamos su hash SHA-256,
-- así que aunque alguien leyera esta tabla no podría usar las sesiones.
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

-- +goose Down
DROP TABLE sessions;
