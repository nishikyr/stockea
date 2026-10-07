package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/auth"
	"github.com/nishikyr/stockea/internal/db"
)

type AuthHandler struct {
	Queries      *db.Queries
	Tokens       *auth.TokenManager
	SecureCookie bool // true en producción (solo HTTPS)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// userResponse: lo que devolvemos al frontend (¡nunca el password_hash!)
type userResponse struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	IsAdmin bool   `json:"is_admin"`
}

func toUserResponse(u db.User) userResponse {
	return userResponse{
		ID:      uuidString(u.ID),
		Email:   u.Email,
		Name:    u.Name,
		IsAdmin: u.IsAdmin,
	}
}

// POST /api/auth/login
func (h *AuthHandler) Login(c echo.Context) error {
	var req loginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "petición no válida")
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "email y contraseña son obligatorios")
	}

	user, err := h.Queries.GetUserByEmail(c.Request().Context(), req.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		auth.CompareWithDummy(req.Password)
		return invalidCredentials()
	}
	if err != nil {
		return err
	}
	if !auth.CheckPassword(user.PasswordHash, req.Password) {
		return invalidCredentials()
	}

	token, err := h.Tokens.Issue(uuidString(user.ID), user.IsAdmin)
	if err != nil {
		return err
	}
	c.SetCookie(h.sessionCookie(token, time.Now().Add(auth.SessionTTL)))
	return c.JSON(http.StatusOK, toUserResponse(user))
}

// POST /api/auth/logout
func (h *AuthHandler) Logout(c echo.Context) error {
	c.SetCookie(h.sessionCookie("", time.Unix(0, 0)))
	return c.NoContent(http.StatusNoContent)
}

// GET /api/auth/me — quién soy (el frontend lo usa al cargar la página)
func (h *AuthHandler) Me(c echo.Context) error {
	var id pgtype.UUID
	if err := id.Scan(auth.CurrentClaims(c).UserID); err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "sesión no válida")
	}
	user, err := h.Queries.GetUserByID(c.Request().Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		return echo.NewHTTPError(http.StatusUnauthorized, "el usuario ya no existe")
	}
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, toUserResponse(user))
}

func (h *AuthHandler) sessionCookie(value string, expires time.Time) *http.Cookie {
	return &http.Cookie{
		Name:     auth.CookieName,
		Value:    value,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,                 // JavaScript no puede leerla (protege de XSS)
		Secure:   h.SecureCookie,       // solo se envía por HTTPS en producción
		SameSite: http.SameSiteLaxMode, // protege de CSRF básico
	}
}

// Mismo mensaje para email inexistente y contraseña incorrecta
func invalidCredentials() error {
	return echo.NewHTTPError(http.StatusUnauthorized, "email o contraseña incorrectos")
}

func uuidString(u pgtype.UUID) string {
	v, _ := u.Value()
	s, _ := v.(string)
	return s
}
