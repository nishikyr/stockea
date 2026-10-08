-- name: CreateProject :one
INSERT INTO projects (name, description, created_by)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetProject :one
SELECT * FROM projects WHERE id = $1;

-- Todos los proyectos (para el admin), con contadores para las tarjetas
-- name: ListAllProjects :many
SELECT p.*,
       (SELECT count(*) FROM products pr WHERE pr.project_id = p.id)::int AS product_count,
       (SELECT count(*) FROM products pr WHERE pr.project_id = p.id AND pr.quantity <= pr.min_quantity)::int AS low_stock_count,
       (SELECT count(*) FROM project_members m WHERE m.project_id = p.id)::int AS member_count
FROM projects p
ORDER BY p.name;

-- Proyectos de los que el usuario es miembro, con su rol y los mismos contadores
-- name: ListProjectsForUser :many
SELECT p.*, pm.role,
       (SELECT count(*) FROM products pr WHERE pr.project_id = p.id)::int AS product_count,
       (SELECT count(*) FROM products pr WHERE pr.project_id = p.id AND pr.quantity <= pr.min_quantity)::int AS low_stock_count,
       (SELECT count(*) FROM project_members m WHERE m.project_id = p.id)::int AS member_count
FROM projects p
JOIN project_members pm ON pm.project_id = p.id
WHERE pm.user_id = $1
ORDER BY p.name;

-- name: UpdateProject :one
UPDATE projects SET name = $2, description = $3
WHERE id = $1
RETURNING *;

-- Rol de un usuario en un proyecto (si no es miembro, no devuelve filas)
-- name: GetProjectRole :one
SELECT role FROM project_members
WHERE project_id = $1 AND user_id = $2;

-- Añade un miembro o le cambia el rol si ya lo era
-- name: UpsertProjectMember :exec
INSERT INTO project_members (project_id, user_id, role)
VALUES ($1, $2, $3)
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- name: ListProjectMembers :many
SELECT u.id, u.email, u.name, pm.role
FROM project_members pm
JOIN users u ON u.id = pm.user_id
WHERE pm.project_id = $1
ORDER BY u.name;

-- name: DeleteProjectMember :execrows
DELETE FROM project_members
WHERE project_id = $1 AND user_id = $2;
