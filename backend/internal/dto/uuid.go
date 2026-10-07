package dto

import "github.com/jackc/pgx/v5/pgtype"

// UUIDString convierte un UUID de Postgres a texto ("" si es nulo).
func UUIDString(u pgtype.UUID) string {
	v, _ := u.Value()
	s, _ := v.(string)
	return s
}

// ParseUUID convierte texto (p. ej. un parámetro de la URL) a UUID de Postgres.
func ParseUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	err := u.Scan(s)
	return u, err
}
