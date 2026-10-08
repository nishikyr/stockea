package handlers

import (
	"strconv"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"

	"github.com/nishikyr/stockea/internal/dto"
	"github.com/nishikyr/stockea/internal/services"
)

// pathUUID lee un id de la URL (p. ej. :productID). Si no es un UUID válido,
// devuelve el "no encontrado" que se le pase: para el usuario es lo mismo.
func pathUUID(c echo.Context, name string, notFound error) (pgtype.UUID, error) {
	id, err := dto.ParseUUID(c.Param(name))
	if err != nil {
		return pgtype.UUID{}, notFound
	}
	return id, nil
}

// queryUUID lee un id opcional de la query (?category_id=...).
func queryUUID(c echo.Context, name string) (pgtype.UUID, error) {
	v := c.QueryParam(name)
	id, err := dto.ParseOptionalUUID(&v)
	if err != nil {
		return pgtype.UUID{}, services.ErrInvalidID
	}
	return id, nil
}

// queryInt lee un número opcional de la query (?limit=20). Si falta o no es válido, usa def.
func queryInt(c echo.Context, name string, def int32) int32 {
	n, err := strconv.ParseInt(c.QueryParam(name), 10, 32)
	if err != nil {
		return def
	}
	return int32(n)
}

// bodyUUID convierte un id opcional del JSON; si no es válido devuelve el error indicado.
func bodyUUID(s *string, notFound error) (pgtype.UUID, error) {
	id, err := dto.ParseOptionalUUID(s)
	if err != nil {
		return pgtype.UUID{}, notFound
	}
	return id, nil
}
