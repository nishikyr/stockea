-- name: ListLocations :many
SELECT l.*, count(p.id)::int AS product_count
FROM locations l
LEFT JOIN products p ON p.location_id = l.id
WHERE l.project_id = $1
GROUP BY l.id
ORDER BY l.name;

-- name: GetLocation :one
SELECT * FROM locations WHERE project_id = $1 AND id = $2;

-- name: CreateLocation :one
INSERT INTO locations (project_id, parent_id, name, description)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateLocation :one
UPDATE locations SET parent_id = $3, name = $4, description = $5
WHERE project_id = $1 AND id = $2
RETURNING *;

-- ¿Es `candidate` la propia ubicación `id` o una de sus descendientes?
-- Sirve para impedir ciclos (Caja 3 dentro de Estantería A dentro de Caja 3...).
-- name: IsLocationOrDescendant :one
WITH RECURSIVE subtree(loc_id) AS (
    SELECT sqlc.arg(id)::uuid
    UNION
    SELECT c.id FROM locations c JOIN subtree ON c.parent_id = subtree.loc_id
)
SELECT EXISTS (SELECT 1 FROM subtree WHERE loc_id = sqlc.arg(candidate)::uuid)::bool;

-- Las sububicaciones pasan a no tener padre y los productos se quedan sin ubicación
-- name: DeleteLocation :execrows
DELETE FROM locations WHERE project_id = $1 AND id = $2;
