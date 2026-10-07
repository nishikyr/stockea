-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = lower(sqlc.arg(email));

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, is_admin)
VALUES (lower(sqlc.arg(email)), sqlc.arg(password_hash), sqlc.arg(name), sqlc.arg(is_admin))
RETURNING *;

-- Rol de un usuario dentro de un proyecto (si no es miembro, no devuelve filas)
-- name: GetProjectRole :one
SELECT role FROM project_members
WHERE project_id = $1 AND user_id = $2;
