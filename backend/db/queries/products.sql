-- Listado con filtros opcionales: cada filtro se ignora si llega NULL.
-- name: ListProducts :many
SELECT p.*,
       c.name  AS category_name,
       c.color AS category_color,
       c.icon  AS category_icon,
       l.name  AS location_name
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN locations  l ON l.id = p.location_id
WHERE p.project_id = sqlc.arg(project_id)
  AND (sqlc.narg(category_id)::uuid IS NULL OR p.category_id = sqlc.narg(category_id))
  AND (sqlc.narg(location_id)::uuid IS NULL OR p.location_id = sqlc.narg(location_id))
  AND (sqlc.narg(search)::text IS NULL OR p.name ILIKE '%' || sqlc.narg(search) || '%')
  AND (NOT sqlc.arg(low_stock_only)::bool OR p.quantity <= p.min_quantity)
ORDER BY p.name;

-- name: GetProductDetail :one
SELECT p.*,
       c.name  AS category_name,
       c.color AS category_color,
       c.icon  AS category_icon,
       l.name  AS location_name
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN locations  l ON l.id = p.location_id
WHERE p.project_id = $1 AND p.id = $2;

-- Bloquea la fila hasta que termine la transacción: si dos personas registran
-- una salida a la vez, la segunda espera y ve el stock ya actualizado.
-- name: GetProductForUpdate :one
SELECT * FROM products WHERE project_id = $1 AND id = $2 FOR UPDATE;

-- name: CreateProduct :one
INSERT INTO products (project_id, category_id, location_id, name, description, unit, min_quantity)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- Edita los datos del producto. La cantidad NO se toca aquí: solo cambia con movimientos.
-- name: UpdateProduct :one
UPDATE products
SET category_id = $3, location_id = $4, name = $5, description = $6,
    unit = $7, min_quantity = $8, updated_at = now()
WHERE project_id = $1 AND id = $2
RETURNING *;

-- name: SetProductQuantity :exec
UPDATE products SET quantity = $2, updated_at = now() WHERE id = $1;

-- Borra también sus movimientos y fotos (ON DELETE CASCADE)
-- name: DeleteProduct :execrows
DELETE FROM products WHERE project_id = $1 AND id = $2;
