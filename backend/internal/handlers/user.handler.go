package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/services"
)

type UserHandler struct {
	Users *services.UserService
}

// GET /api/users — (admin) lista de usuarios
func (h *UserHandler) List(c echo.Context) error {
	users, err := h.Users.List(c.Request().Context())
	if err != nil {
		return err
	}
	out := make([]dto.UserResponse, len(users))
	for i, u := range users {
		out[i] = dto.NewUserResponse(u)
	}
	return c.JSON(http.StatusOK, out)
}

// POST /api/users — (admin) crea una cuenta normal, p. ej. la de tu tía
func (h *UserHandler) Create(c echo.Context) error {
	var req dto.CreateUserRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	user, err := h.Users.Create(c.Request().Context(), services.CreateUserInput{
		Email:    req.Email,
		Name:     req.Name,
		Password: req.Password,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, dto.NewUserResponse(user))
}

// PUT /api/users/:userID/password — (admin) pone una contraseña nueva y cierra sus sesiones
func (h *UserHandler) ResetPassword(c echo.Context) error {
	userID, err := pathUUID(c, "userID", services.ErrUserIDNotFound)
	if err != nil {
		return err
	}
	var req dto.ResetPasswordRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	if err := h.Users.ResetPassword(c.Request().Context(), userID, req.NewPassword); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
