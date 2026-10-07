package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"time"
)

const (
	CookieName = "stockea_session"
	SessionTTL = 7 * 24 * time.Hour // la sesión dura 7 días
)

// NewSessionToken genera un token aleatorio de 256 bits.
// - token: va en la cookie del navegador
// - hash:  es lo único que se guarda en la base de datos
func NewSessionToken() (token, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	token = base64.RawURLEncoding.EncodeToString(b)
	return token, HashToken(token), nil
}

// HashToken calcula el SHA-256 del token para buscarlo en la tabla sessions.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
