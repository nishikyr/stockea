-- name: CreateMovement :one
INSERT INTO movements (product_id, user_id, type, quantity, reason)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- Historial del proyecto (o de un producto), lo más reciente primero.
-- name: ListMovements :many
SELECT m.*,
       p.name AS product_name,
       p.unit AS product_unit,
       u.name AS user_name
FROM movements m
JOIN products p ON p.id = m.product_id
JOIN users    u ON u.id = m.user_id
WHERE p.project_id = sqlc.arg(project_id)
  AND (sqlc.narg(product_id)::uuid IS NULL OR m.product_id = sqlc.narg(product_id))
  AND (sqlc.narg(type)::movement_type IS NULL OR m.type = sqlc.narg(type))
ORDER BY m.created_at DESC
LIMIT sqlc.arg(max_rows) OFFSET sqlc.arg(skip_rows);
