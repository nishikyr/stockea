package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/middleware"
	"github.com/nishikyr/stockea/internal/services"
)

type LocationHandler struct {
	Locations *services.LocationService
}

// GET /api/projects/:projectID/locations
func (h *LocationHandler) List(c echo.Context) error {
	rows, err := h.Locations.List(c.Request().Context(), middleware.ProjectID(c))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewLocationListResponse(rows))
}

// POST /api/projects/:projectID/locations
func (h *LocationHandler) Create(c echo.Context) error {
	in, err := bindLocation(c)
	if err != nil {
		return err
	}
	loc, err := h.Locations.Create(c.Request().Context(), middleware.ProjectID(c), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, dto.NewLocationResponse(loc))
}

// PUT /api/projects/:projectID/locations/:locationID
func (h *LocationHandler) Update(c echo.Context) error {
	id, err := pathUUID(c, "locationID", services.ErrLocationNotFound)
	if err != nil {
		return err
	}
	in, err := bindLocation(c)
	if err != nil {
		return err
	}
	loc, err := h.Locations.Update(c.Request().Context(), middleware.ProjectID(c), id, in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, dto.NewLocationResponse(loc))
}

// DELETE /api/projects/:projectID/locations/:locationID
func (h *LocationHandler) Delete(c echo.Context) error {
	id, err := pathUUID(c, "locationID", services.ErrLocationNotFound)
	if err != nil {
		return err
	}
	if err := h.Locations.Delete(c.Request().Context(), middleware.ProjectID(c), id); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}

func bindLocation(c echo.Context) (services.LocationInput, error) {
	var req dto.LocationRequest
	if err := c.Bind(&req); err != nil {
		return services.LocationInput{}, services.ErrInvalidRequest
	}
	parentID, err := bodyUUID(req.ParentID, services.ErrLocationNotFound)
	if err != nil {
		return services.LocationInput{}, err
	}
	return services.LocationInput{Name: req.Name, Description: req.Description, ParentID: parentID}, nil
}
