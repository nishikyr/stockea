package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	CookieName = "stockea_session"
	SessionTTL = 7 * 24 * time.Hour // la sesión dura 7 días
)

// Claims es lo que guardamos dentro del JWT.
// No metemos el rol de proyecto aquí: se consulta en la BD en cada petición,
// así si le quitas acceso a alguien, surte efecto al instante.
type Claims struct {
	UserID  string `json:"uid"`
	IsAdmin bool   `json:"adm"`
	jwt.RegisteredClaims
}

// TokenManager firma y valida tokens con el secreto de JWT_SECRET.
type TokenManager struct {
	secret []byte
}

func NewTokenManager(secret string) (*TokenManager, error) {
	if len(secret) < 32 {
		return nil, errors.New("JWT_SECRET debe tener al menos 32 caracteres")
	}
	return &TokenManager{secret: []byte(secret)}, nil
}

func (tm *TokenManager) Issue(userID string, isAdmin bool) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:  userID,
		IsAdmin: isAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(SessionTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(tm.secret)
}

func (tm *TokenManager) Parse(token string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		return tm.secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, err
	}
	return claims, nil
}
