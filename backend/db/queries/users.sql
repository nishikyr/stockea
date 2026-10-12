-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = lower(sqlc.arg(email));

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, is_admin)
VALUES (lower(sqlc.arg(email)), sqlc.arg(password_hash), sqlc.arg(name), sqlc.arg(is_admin))
RETURNING *;

-- name: ListUsers :many
SELECT * FROM users ORDER BY name;

-- name: UpdateUserPassword :exec
UPDATE users SET password_hash = $2 WHERE id = $1;

-- ¿Ha hecho algún movimiento? (si los tiene, no se puede borrar: se desactiva)
-- name: CountUserMovements :one
SELECT count(*) FROM movements WHERE user_id = $1;

-- Borra la cuenta. Sus sesiones y accesos a proyectos se van en cascada.
-- name: DeleteUser :execrows
DELETE FROM users WHERE id = $1;

-- name: DisableUser :exec
UPDATE users SET disabled_at = now() WHERE id = $1;

-- name: EnableUser :exec
UPDATE users SET disabled_at = NULL WHERE id = $1;
