package services

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/db"
)

// TxStarter es cualquier cosa que pueda abrir una transacción (en la app, el pool de pgx).
type TxStarter interface {
	Begin(ctx context.Context) (pgx.Tx, error)
}

// withTx ejecuta fn dentro de una transacción: si fn devuelve error se deshace todo (rollback);
// si no, se confirma (commit). Así nunca queda un stock cambiado sin su movimiento, ni al revés.
func withTx(ctx context.Context, starter TxStarter, q *db.Queries, fn func(q *db.Queries) error) error {
	tx, err := starter.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // no hace nada si ya se hizo commit

	if err := fn(q.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// optionalText: texto recortado; si queda vacío se guarda como NULL.
func optionalText(s string) pgtype.Text {
	s = strings.TrimSpace(s)
	return pgtype.Text{String: s, Valid: s != ""}
}

// escapeLike evita que % y _ escritos por el usuario actúen como comodines en ILIKE.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}
