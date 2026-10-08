-- name: ListProductPhotos :many
SELECT * FROM product_photos
WHERE product_id = $1
ORDER BY position, created_at;

-- name: CountProductPhotos :one
SELECT count(*)::int FROM product_photos WHERE product_id = $1;

-- name: CreateProductPhoto :one
INSERT INTO product_photos (product_id, storage_key, position)
VALUES ($1, $2, $3)
RETURNING *;

-- Comprueba a la vez que la foto es de ese producto y el producto de ese proyecto
-- name: GetProductPhoto :one
SELECT ph.* FROM product_photos ph
JOIN products p ON p.id = ph.product_id
WHERE p.project_id = $1 AND ph.product_id = $2 AND ph.id = $3;

-- name: DeleteProductPhoto :exec
DELETE FROM product_photos WHERE id = $1;
