package services

import (
	"context"
	"strings"

	"github.com/nishikyr/stockea/internal/auth"
	"github.com/nishikyr/stockea/internal/db"
)

type UserService struct {
	q *db.Queries
}

func NewUserService(q *db.Queries) *UserService {
	return &UserService{q: q}
}

type CreateUserInput struct {
	Email    string
	Name     string
	Password string
	IsAdmin  bool
}

func (s *UserService) Create(ctx context.Context, in CreateUserInput) (db.User, error) {
	in.Email = strings.TrimSpace(in.Email)
	in.Name = strings.TrimSpace(in.Name)

	switch {
	case !strings.Contains(in.Email, "@") || len(in.Email) > 254:
		return db.User{}, validation("email no válido")
	case in.Name == "" || len(in.Name) > 100:
		return db.User{}, validation("el nombre es obligatorio (máx. 100 caracteres)")
	case len(in.Password) < 10:
		return db.User{}, validation("la contraseña debe tener al menos 10 caracteres")
	case len(in.Password) > 72:
		return db.User{}, validation("la contraseña no puede superar 72 caracteres") // límite de bcrypt
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return db.User{}, err
	}
	user, err := s.q.CreateUser(ctx, db.CreateUserParams{
		Email:        in.Email,
		PasswordHash: hash,
		Name:         in.Name,
		IsAdmin:      in.IsAdmin,
	})
	if isUniqueViolation(err) {
		return db.User{}, ErrEmailAlreadyExists
	}
	return user, err
}

func (s *UserService) List(ctx context.Context) ([]db.User, error) {
	return s.q.ListUsers(ctx)
}
