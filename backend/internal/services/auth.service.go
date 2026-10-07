package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/auth"
	"github.com/nishikyr/stockea/internal/db"
)

type AuthService struct {
	q *db.Queries
}

func NewAuthService(q *db.Queries) *AuthService {
	return &AuthService{q: q}
}

// Login comprueba email y contraseña y crea una sesión nueva.
// Devuelve el token que irá en la cookie.
func (s *AuthService) Login(ctx context.Context, email, password string) (string, db.User, error) {
	email = strings.TrimSpace(email)
	if email == "" || password == "" {
		return "", db.User{}, validation("email y contraseña son obligatorios")
	}

	user, err := s.q.GetUserByEmail(ctx, email)
	if errors.Is(err, pgx.ErrNoRows) {
		// Gastamos el mismo tiempo que con un email real para no revelar qué emails existen
		auth.CompareWithDummy(password)
		return "", db.User{}, ErrInvalidCredentials
	}
	if err != nil {
		return "", db.User{}, err
	}
	if !auth.CheckPassword(user.PasswordHash, password) {
		return "", db.User{}, ErrInvalidCredentials
	}

	_ = s.q.DeleteExpiredSessions(ctx) // limpieza de paso; si falla no importa

	token, hash, err := auth.NewSessionToken()
	if err != nil {
		return "", db.User{}, err
	}
	err = s.q.CreateSession(ctx, db.CreateSessionParams{
		TokenHash: hash,
		UserID:    user.ID,
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(auth.SessionTTL), Valid: true},
	})
	if err != nil {
		return "", db.User{}, err
	}
	return token, user, nil
}

// UserFromToken devuelve el usuario de una sesión válida.
func (s *AuthService) UserFromToken(ctx context.Context, token string) (db.User, error) {
	user, err := s.q.GetUserBySessionToken(ctx, auth.HashToken(token))
	if errors.Is(err, pgx.ErrNoRows) {
		return db.User{}, ErrSessionInvalid
	}
	return user, err
}

// Logout borra la sesión de la base de datos: el token deja de valer al instante.
func (s *AuthService) Logout(ctx context.Context, token string) error {
	return s.q.DeleteSession(ctx, auth.HashToken(token))
}
