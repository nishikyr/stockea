package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/middleware"
	"github.com/nishikyr/stockea/internal/services"
)

type ProjectHandler struct {
	Projects *services.ProjectService
}

// GET /api/projects — tus proyectos (el admin ve todos)
func (h *ProjectHandler) List(c echo.Context) error {
	projects, err := h.Projects.ListForUser(c.Request().Context(), middleware.CurrentUser(c))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewProjectListResponse(projects))
}

// POST /api/projects — (admin) crea un proyecto, p. ej. "HomeBox Atocha - Madrid"
func (h *ProjectHandler) Create(c echo.Context) error {
	var req dto.CreateProjectRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	project, err := h.Projects.Create(c.Request().Context(), req.Name, req.Description, middleware.CurrentUser(c).ID)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, dto.NewProjectResponse(project, services.RoleAdmin))
}

// GET /api/projects/:projectID
func (h *ProjectHandler) Get(c echo.Context) error {
	project, err := h.Projects.Get(c.Request().Context(), middleware.ProjectID(c))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewProjectResponse(project, middleware.ProjectRole(c)))
}

// PUT /api/projects/:projectID — (admin) cambia nombre y descripción
func (h *ProjectHandler) Update(c echo.Context) error {
	var req dto.CreateProjectRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	project, err := h.Projects.Update(c.Request().Context(), middleware.ProjectID(c), req.Name, req.Description)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewProjectResponse(project, middleware.ProjectRole(c)))
}

// GET /api/projects/:projectID/members — (admin)
func (h *ProjectHandler) ListMembers(c echo.Context) error {
	members, err := h.Projects.ListMembers(c.Request().Context(), middleware.ProjectID(c))
	if err != nil {
		return err
	}
	out := make([]dto.MemberResponse, len(members))
	for i, m := range members {
		out[i] = dto.NewMemberResponse(m)
	}
	return c.JSON(http.StatusOK, out)
}

// PUT /api/projects/:projectID/members — (admin) añade un miembro o cambia su rol
func (h *ProjectHandler) SetMember(c echo.Context) error {
	var req dto.SetMemberRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	member, err := h.Projects.SetMember(c.Request().Context(), middleware.ProjectID(c), req.Email, req.Role)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewMemberResponse(member))
}

// DELETE /api/projects/:projectID/members/:userID — (admin) quita el acceso
func (h *ProjectHandler) RemoveMember(c echo.Context) error {
	userID, err := dto.ParseUUID(c.Param("userID"))
	if err != nil {
		return services.ErrInvalidID
	}
	if err := h.Projects.RemoveMember(c.Request().Context(), middleware.ProjectID(c), userID); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
