package services

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
)

// Kind clasifica los errores de negocio. Los services no saben nada de HTTP:
// es el ErrorHandler (handlers/error.handler.go) quien traduce cada Kind a un código.
type Kind int

const (
	KindValidation   Kind = iota + 1 // → 400
	KindUnauthorized                 // → 401
	KindForbidden                    // → 403
	KindNotFound                     // → 404
	KindConflict                     // → 409
)

type Error struct {
	Kind    Kind
	Message string
}

func (e *Error) Error() string { return e.Message }

func validation(msg string) *Error { return &Error{KindValidation, msg} }

var (
	ErrNotLoggedIn        = &Error{KindUnauthorized, "no has iniciado sesión"}
	ErrSessionInvalid     = &Error{KindUnauthorized, "sesión no válida o caducada"}
	ErrInvalidCredentials = &Error{KindUnauthorized, "email o contraseña incorrectos"}
	ErrAdminOnly          = &Error{KindForbidden, "solo el administrador puede hacer esto"}
	ErrInsufficientRole   = &Error{KindForbidden, "no tienes permiso para hacer esto en este proyecto"}
	ErrProjectNotFound    = &Error{KindNotFound, "proyecto no encontrado"}
	ErrUserNotFound       = &Error{KindNotFound, "no existe ningún usuario con ese email"}
	ErrMemberNotFound     = &Error{KindNotFound, "ese usuario no es miembro del proyecto"}
	ErrEmailAlreadyExists = &Error{KindConflict, "ya existe un usuario con ese email"}
	ErrInvalidID          = validation("id no válido")
	ErrInvalidRequest     = validation("petición no válida")

	// Inventario
	ErrCategoryNotFound  = &Error{KindNotFound, "categoría no encontrada"}
	ErrLocationNotFound  = &Error{KindNotFound, "ubicación no encontrada"}
	ErrProductNotFound   = &Error{KindNotFound, "producto no encontrado"}
	ErrCategoryNameTaken = &Error{KindConflict, "ya existe una categoría con ese nombre"}
	ErrLocationCycle     = validation("una ubicación no puede estar dentro de sí misma ni de una de sus sububicaciones")
	ErrNothingToAdjust   = validation("la cantidad contada es igual al stock actual: no hay nada que ajustar")
	ErrPhotoNotFound     = &Error{KindNotFound, "foto no encontrada"}
	ErrUserIDNotFound    = &Error{KindNotFound, "usuario no encontrado"}
	ErrWrongPassword     = &Error{KindValidation, "la contraseña actual no es correcta"}
)

// insufficientStock: el mensaje incluye cuánto queda, para que el usuario sepa qué pasa.
func insufficientStock(available int32, unit string) *Error {
	return &Error{KindConflict, fmt.Sprintf("no hay suficiente stock (quedan %d %s)", available, unit)}
}

// isUniqueViolation detecta el error de Postgres por clave duplicada (código 23505).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
