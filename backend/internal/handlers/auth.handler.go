package handlers

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/auth"
	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/middleware"
	"github.com/nishikyr/stockea/internal/services"
)

type AuthHandler struct {
	Auth         *services.AuthService
	SecureCookie bool // true en producción (cookie solo por HTTPS)
}

// POST /api/auth/login
func (h *AuthHandler) Login(c echo.Context) error {
	var req dto.LoginRequest
	if err := c.Bind(&req); err != nil {
		return services.ErrInvalidRequest
	}
	token, user, err := h.Auth.Login(c.Request().Context(), req.Email, req.Password)
	if err != nil {
		return err
	}
	c.SetCookie(h.sessionCookie(token, time.Now().Add(auth.SessionTTL)))
	return c.JSON(http.StatusOK, dto.NewUserResponse(user))
}

// POST /api/auth/logout — borra la sesión en la BD y la cookie en el navegador
func (h *AuthHandler) Logout(c echo.Context) error {
	if cookie, err := c.Cookie(auth.CookieName); err == nil && cookie.Value != "" {
		if err := h.Auth.Logout(c.Request().Context(), cookie.Value); err != nil {
			return err
		}
	}
	c.SetCookie(h.sessionCookie("", time.Unix(0, 0)))
	return c.NoContent(http.StatusNoContent)
}

// GET /api/auth/me — quién soy (el frontend lo usará al cargar la página)
func (h *AuthHandler) Me(c echo.Context) error {
	return c.JSON(http.StatusOK, dto.NewUserResponse(middleware.CurrentUser(c)))
}

func (h *AuthHandler) sessionCookie(value string, expires time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     auth.CookieName,
		Value:    value,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,                 // JavaScript no puede leerla (protege de XSS)
		Secure:   h.SecureCookie,       // solo viaja por HTTPS en producción
		SameSite: http.SameSiteLaxMode, // otras webs no pueden usar tu sesión
	}
}
