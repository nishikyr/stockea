-- name: ListProducts :many
SELECT p.*, c.name AS category_name, l.name AS location_name
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN locations  l ON l.id = p.location_id
WHERE p.project_id = $1
ORDER BY p.name;

-- name: GetProduct :one
SELECT * FROM products WHERE id = $1;

-- name: CreateProduct :one
INSERT INTO products (project_id, category_id, location_id, name, description, unit, min_quantity)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListLowStock :many
SELECT * FROM products
WHERE project_id = $1 AND quantity <= min_quantity
ORDER BY name;

-- Cambiar stock: estas dos consultas se ejecutan SIEMPRE juntas en una transacción
-- name: ApplyStockDelta :one
UPDATE products
SET quantity = quantity + sqlc.arg(delta), updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: CreateMovement :one
INSERT INTO movements (product_id, user_id, type, quantity, reason)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListMovements :many
SELECT m.*, u.name AS user_name
FROM movements m
JOIN users u ON u.id = m.user_id
WHERE m.product_id = $1
ORDER BY m.created_at DESC
LIMIT $2;
