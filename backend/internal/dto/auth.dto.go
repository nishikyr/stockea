package dto

import "github.com/nishikyr/stockea/internal/db"

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// UserResponse es lo que la API devuelve de un usuario (¡nunca el password_hash!).
type UserResponse struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	IsAdmin bool   `json:"is_admin"`
}

func NewUserResponse(u db.User) UserResponse {
	return UserResponse{
		ID:      UUIDString(u.ID),
		Email:   u.Email,
		Name:    u.Name,
		IsAdmin: u.IsAdmin,
	}
}
