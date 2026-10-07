package services

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/db"
)

// Roles de un usuario respecto a un proyecto, de menos a más permisos.
// "admin" no existe en la BD: es el administrador global, que puede con todo.
const (
	RoleViewer = "viewer"
	RoleEditor = "editor"
	RoleAdmin  = "admin"
)

var roleRank = map[string]int{RoleViewer: 1, RoleEditor: 2, RoleAdmin: 3}

// RoleAtLeast dice si el rol `role` cumple el mínimo exigido.
func RoleAtLeast(role, min string) bool {
	return roleRank[role] >= roleRank[min]
}

type ProjectService struct {
	q *db.Queries
}

func NewProjectService(q *db.Queries) *ProjectService {
	return &ProjectService{q: q}
}

// ProjectWithRole es un proyecto junto con el rol del usuario que lo consulta.
type ProjectWithRole struct {
	db.Project
	Role string
}

func (s *ProjectService) Create(ctx context.Context, name, description string, createdBy pgtype.UUID) (db.Project, error) {
	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)
	if name == "" || len(name) > 100 {
		return db.Project{}, validation("el nombre del proyecto es obligatorio (máx. 100 caracteres)")
	}
	return s.q.CreateProject(ctx, db.CreateProjectParams{
		Name:        name,
		Description: pgtype.Text{String: description, Valid: description != ""},
		CreatedBy:   createdBy,
	})
}

// ListForUser: el admin ve todos los proyectos; el resto, solo aquellos de los que es miembro.
func (s *ProjectService) ListForUser(ctx context.Context, user db.User) ([]ProjectWithRole, error) {
	if user.IsAdmin {
		projects, err := s.q.ListAllProjects(ctx)
		if err != nil {
			return nil, err
		}
		out := make([]ProjectWithRole, len(projects))
		for i, p := range projects {
			out[i] = ProjectWithRole{Project: p, Role: RoleAdmin}
		}
		return out, nil
	}

	rows, err := s.q.ListProjectsForUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	out := make([]ProjectWithRole, len(rows))
	for i, r := range rows {
		out[i] = ProjectWithRole{
			Project: db.Project{ID: r.ID, Name: r.Name, Description: r.Description, CreatedBy: r.CreatedBy, CreatedAt: r.CreatedAt},
			Role:    string(r.Role),
		}
	}
	return out, nil
}

func (s *ProjectService) Get(ctx context.Context, id pgtype.UUID) (db.Project, error) {
	p, err := s.q.GetProject(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.Project{}, ErrProjectNotFound
	}
	return p, err
}

// RoleOf devuelve el rol del usuario en el proyecto.
// Si no es miembro devolvemos "no encontrado" (en vez de "prohibido")
// para no revelar que el proyecto existe.
func (s *ProjectService) RoleOf(ctx context.Context, projectID pgtype.UUID, user db.User) (string, error) {
	if user.IsAdmin {
		if _, err := s.Get(ctx, projectID); err != nil {
			return "", err
		}
		return RoleAdmin, nil
	}
	role, err := s.q.GetProjectRole(ctx, db.GetProjectRoleParams{ProjectID: projectID, UserID: user.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrProjectNotFound
	}
	return string(role), err
}

// SetMember añade a un usuario (por email) al proyecto, o le cambia el rol si ya era miembro.
func (s *ProjectService) SetMember(ctx context.Context, projectID pgtype.UUID, email, role string) (db.ListProjectMembersRow, error) {
	if role != RoleEditor && role != RoleViewer {
		return db.ListProjectMembersRow{}, validation(`el rol debe ser "editor" o "viewer"`)
	}
	user, err := s.q.GetUserByEmail(ctx, strings.TrimSpace(email))
	if errors.Is(err, pgx.ErrNoRows) {
		return db.ListProjectMembersRow{}, ErrUserNotFound
	}
	if err != nil {
		return db.ListProjectMembersRow{}, err
	}
	if user.IsAdmin {
		return db.ListProjectMembersRow{}, validation("el administrador ya tiene acceso a todos los proyectos")
	}

	err = s.q.UpsertProjectMember(ctx, db.UpsertProjectMemberParams{
		ProjectID: projectID,
		UserID:    user.ID,
		Role:      db.ProjectRole(role),
	})
	if err != nil {
		return db.ListProjectMembersRow{}, err
	}
	return db.ListProjectMembersRow{ID: user.ID, Email: user.Email, Name: user.Name, Role: db.ProjectRole(role)}, nil
}

func (s *ProjectService) ListMembers(ctx context.Context, projectID pgtype.UUID) ([]db.ListProjectMembersRow, error) {
	return s.q.ListProjectMembers(ctx, projectID)
}

func (s *ProjectService) RemoveMember(ctx context.Context, projectID, userID pgtype.UUID) error {
	n, err := s.q.DeleteProjectMember(ctx, db.DeleteProjectMemberParams{ProjectID: projectID, UserID: userID})
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrMemberNotFound
	}
	return nil
}
