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
