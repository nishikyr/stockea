package dto

// CreateUserRequest: el admin crea cuentas normales (no admins) desde la API.
type CreateUserRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

// ResetPasswordRequest: el admin pone una contraseña nueva a otra persona.
type ResetPasswordRequest struct {
	NewPassword string `json:"new_password"`
}
