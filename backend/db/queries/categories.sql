-- Todas las consultas filtran por project_id: así es imposible tocar datos de otro proyecto
-- aunque alguien ponga en la URL el id de una categoría ajena.

-- name: ListCategories :many
SELECT c.*, count(p.id)::int AS product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE c.project_id = $1
GROUP BY c.id
ORDER BY c.name;

-- name: GetCategory :one
SELECT * FROM categories WHERE project_id = $1 AND id = $2;

-- name: CreateCategory :one
INSERT INTO categories (project_id, name, color, icon)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateCategory :one
UPDATE categories SET name = $3, color = $4, icon = $5
WHERE project_id = $1 AND id = $2
RETURNING *;

-- Los productos de esta categoría se quedan sin categoría (ON DELETE SET NULL)
-- name: DeleteCategory :execrows
DELETE FROM categories WHERE project_id = $1 AND id = $2;
