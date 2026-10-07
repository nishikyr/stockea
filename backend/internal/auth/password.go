package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword cifra la contraseña con bcrypt (incluye sal automáticamente).
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

// CheckPassword devuelve true si la contraseña coincide con el hash.
func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// dummyHash se usa cuando el email no existe, para que la respuesta tarde
// lo mismo que con un email válido (así no se puede adivinar qué emails existen).
var dummyHash, _ = HashPassword("stockea-dummy-password")

// CompareWithDummy gasta el mismo tiempo que una comprobación real.
func CompareWithDummy(password string) {
	_ = bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(password))
}
