package dto

// CreateUserRequest: el admin crea cuentas normales (no admins) desde la API.
type CreateUserRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}
