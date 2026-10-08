-- name: CreateSession :exec
INSERT INTO sessions (token_hash, user_id, expires_at)
VALUES ($1, $2, $3);

-- Devuelve el usuario dueño de una sesión que no haya caducado
-- name: GetUserBySessionToken :one
SELECT u.* FROM users u
JOIN sessions s ON s.user_id = u.id
WHERE s.token_hash = $1 AND s.expires_at > now();

-- name: DeleteSession :exec
DELETE FROM sessions WHERE token_hash = $1;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at <= now();

-- Cierra todas las sesiones de un usuario salvo la indicada (la actual).
-- Pasando un hash vacío se cierran todas.
-- name: DeleteUserSessionsExcept :exec
DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2;
