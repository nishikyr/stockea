-- name: CreateProject :one
INSERT INTO projects (name, description, created_by)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetProject :one
SELECT * FROM projects WHERE id = $1;

-- Todos los proyectos (para el admin)
-- name: ListAllProjects :many
SELECT * FROM projects ORDER BY name;

-- Proyectos de los que el usuario es miembro, con su rol
-- name: ListProjectsForUser :many
SELECT p.*, pm.role
FROM projects p
JOIN project_members pm ON pm.project_id = p.id
WHERE pm.user_id = $1
ORDER BY p.name;

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
