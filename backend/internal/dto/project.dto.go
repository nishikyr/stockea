package dto

import (
	"time"

	"github.com/nishikyr/stockea/internal/db"
	"github.com/nishikyr/stockea/internal/services"
)

type CreateProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type ProjectResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Role        string    `json:"role"` // tu rol en este proyecto: admin / editor / viewer
	CreatedAt   time.Time `json:"created_at"`
}

func NewProjectResponse(p db.Project, role string) ProjectResponse {
	return ProjectResponse{
		ID:          UUIDString(p.ID),
		Name:        p.Name,
		Description: p.Description.String,
		Role:        role,
		CreatedAt:   p.CreatedAt.Time,
	}
}

// ProjectSummaryResponse: lo que muestra cada tarjeta en la pantalla de proyectos.
type ProjectSummaryResponse struct {
	ProjectResponse
	ProductCount  int32 `json:"product_count"`
	LowStockCount int32 `json:"low_stock_count"`
	MemberCount   int32 `json:"member_count"`
}

func NewProjectListResponse(list []services.ProjectWithRole) []ProjectSummaryResponse {
	out := make([]ProjectSummaryResponse, len(list))
	for i, p := range list {
		out[i] = ProjectSummaryResponse{
			ProjectResponse: NewProjectResponse(p.Project, p.Role),
			ProductCount:    p.ProductCount,
			LowStockCount:   p.LowStockCount,
			MemberCount:     p.MemberCount,
		}
	}
	return out
}

type SetMemberRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"` // "editor" o "viewer"
}

type MemberResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

func NewMemberResponse(m db.ListProjectMembersRow) MemberResponse {
	return MemberResponse{
		ID:    UUIDString(m.ID),
		Email: m.Email,
		Name:  m.Name,
		Role:  string(m.Role),
	}
}
