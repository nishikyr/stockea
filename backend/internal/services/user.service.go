package services

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/auth"
	"github.com/nishikyr/stockea/internal/db"
)

type UserService struct {
	pool TxStarter // para hacer el "borrar o desactivar" en una transacción
	q    *db.Queries
}

func NewUserService(pool TxStarter, q *db.Queries) *UserService {
	return &UserService{pool: pool, q: q}
}

type CreateUserInput struct {
	Email    string
	Name     string
	Password string
	IsAdmin  bool
}

func validatePassword(password string) error {
	switch {
	case len(password) < 10:
		return validation("la contraseña debe tener al menos 10 caracteres")
	case len(password) > 72:
		return validation("la contraseña no puede superar 72 caracteres") // límite de bcrypt
	}
	return nil
}

func (s *UserService) Create(ctx context.Context, in CreateUserInput) (db.User, error) {
	in.Email = strings.TrimSpace(in.Email)
	in.Name = strings.TrimSpace(in.Name)

	switch {
	case !strings.Contains(in.Email, "@") || len(in.Email) > 254:
		return db.User{}, validation("email no válido")
	case in.Name == "" || len(in.Name) > 100:
		return db.User{}, validation("el nombre es obligatorio (máx. 100 caracteres)")
	}
	if err := validatePassword(in.Password); err != nil {
		return db.User{}, err
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

// ChangeOwnPassword: el propio usuario cambia su contraseña (tiene que saber la actual).
// Cierra sus OTRAS sesiones (otros móviles u ordenadores); la actual sigue abierta.
func (s *UserService) ChangeOwnPassword(ctx context.Context, user db.User, currentSessionToken, current, next string) error {
	if !auth.CheckPassword(user.PasswordHash, current) {
		return ErrWrongPassword
	}
	return s.setPassword(ctx, user.ID, next, auth.HashToken(currentSessionToken))
}

// ResetPassword: el admin pone una contraseña nueva a otra persona (p. ej. si la olvidó).
// Cierra TODAS las sesiones de esa persona.
func (s *UserService) ResetPassword(ctx context.Context, userID pgtype.UUID, next string) error {
	if _, err := s.q.GetUserByID(ctx, userID); errors.Is(err, pgx.ErrNoRows) {
		return ErrUserIDNotFound
	} else if err != nil {
		return err
	}
	return s.setPassword(ctx, userID, next, "")
}

func (s *UserService) setPassword(ctx context.Context, userID pgtype.UUID, next, keepSessionHash string) error {
	if err := validatePassword(next); err != nil {
		return err
	}
	hash, err := auth.HashPassword(next)
	if err != nil {
		return err
	}
	if err := s.q.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{ID: userID, PasswordHash: hash}); err != nil {
		return err
	}
	return s.q.DeleteUserSessionsExcept(ctx, db.DeleteUserSessionsExceptParams{UserID: userID, TokenHash: keepSessionHash})
}

// Qué ha pasado al "eliminar" una cuenta
type DeleteUserResult string

const (
	UserDeleted  DeleteUserResult = "deleted"  // se ha borrado del todo
	UserDisabled DeleteUserResult = "disabled" // tenía historial: se ha desactivado
)

// Delete "elimina" una cuenta (solo admin):
//   - si nunca ha hecho movimientos → se BORRA (sus sesiones y accesos se van en cascada);
//   - si tiene historial → se DESACTIVA: no puede entrar, se cierran sus sesiones y pierde el
//     acceso a todos los trasteros, pero su nombre sigue en el historial. Se puede reactivar.
//
// Todo dentro de una transacción: o se hace entero o no se hace nada.
func (s *UserService) Delete(ctx context.Context, actor db.User, userID pgtype.UUID) (DeleteUserResult, error) {
	var result DeleteUserResult
	err := withTx(ctx, s.pool, s.q, func(q *db.Queries) error {
		user, err := q.GetUserByID(ctx, userID)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserIDNotFound
		}
		if err != nil {
			return err
		}
		switch {
		case user.ID == actor.ID:
			return validation("no puedes eliminar tu propia cuenta")
		case user.IsAdmin:
			return validation("no se puede eliminar a un administrador")
		}

		movements, err := q.CountUserMovements(ctx, userID)
		if err != nil {
			return err
		}
		if movements == 0 {
			if _, err := q.DeleteUser(ctx, userID); err != nil {
				return err
			}
			result = UserDeleted
			return nil
		}

		if err := q.DisableUser(ctx, userID); err != nil {
			return err
		}
		// Un hash vacío = cerrar TODAS sus sesiones (si estaba conectada, la echamos al momento)
		if err := q.DeleteUserSessionsExcept(ctx, db.DeleteUserSessionsExceptParams{UserID: userID, TokenHash: ""}); err != nil {
			return err
		}
		if err := q.DeleteUserMemberships(ctx, userID); err != nil {
			return err
		}
		result = UserDisabled
		return nil
	})
	return result, err
}

// Enable reactiva una cuenta desactivada. Ojo: NO le devuelve el acceso a los trasteros;
// eso se vuelve a dar desde cada trastero (así decides tú a cuáles).
func (s *UserService) Enable(ctx context.Context, userID pgtype.UUID) error {
	if _, err := s.q.GetUserByID(ctx, userID); errors.Is(err, pgx.ErrNoRows) {
		return ErrUserIDNotFound
	} else if err != nil {
		return err
	}
	return s.q.EnableUser(ctx, userID)
}
