package services

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/db"
)

const defaultCategoryColor = "#64748b"

var hexColor = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

type CategoryService struct {
	q *db.Queries
}

func NewCategoryService(q *db.Queries) *CategoryService {
	return &CategoryService{q: q}
}

type CategoryInput struct {
	Name  string
	Color string // "#rrggbb"; vacío = gris por defecto
	Icon  string // nombre de icono para el frontend, p. ej. "wrench"
}

func (in *CategoryInput) validate() error {
	in.Name = strings.TrimSpace(in.Name)
	in.Color = strings.TrimSpace(in.Color)
	in.Icon = strings.TrimSpace(in.Icon)
	if in.Color == "" {
		in.Color = defaultCategoryColor
	}
	switch {
	case in.Name == "" || len(in.Name) > 60:
		return validation("el nombre de la categoría es obligatorio (máx. 60 caracteres)")
	case !hexColor.MatchString(in.Color):
		return validation(`el color debe tener el formato "#rrggbb"`)
	case len(in.Icon) > 40:
		return validation("el nombre del icono es demasiado largo")
	}
	return nil
}

func (s *CategoryService) List(ctx context.Context, projectID pgtype.UUID) ([]db.ListCategoriesRow, error) {
	return s.q.ListCategories(ctx, projectID)
}

func (s *CategoryService) Create(ctx context.Context, projectID pgtype.UUID, in CategoryInput) (db.Category, error) {
	if err := in.validate(); err != nil {
		return db.Category{}, err
	}
	cat, err := s.q.CreateCategory(ctx, db.CreateCategoryParams{
		ProjectID: projectID,
		Name:      in.Name,
		Color:     in.Color,
		Icon:      optionalText(in.Icon),
	})
	if isUniqueViolation(err) {
		return db.Category{}, ErrCategoryNameTaken
	}
	return cat, err
}

func (s *CategoryService) Update(ctx context.Context, projectID, id pgtype.UUID, in CategoryInput) (db.Category, error) {
	if err := in.validate(); err != nil {
		return db.Category{}, err
	}
	cat, err := s.q.UpdateCategory(ctx, db.UpdateCategoryParams{
		ProjectID: projectID,
		ID:        id,
		Name:      in.Name,
		Color:     in.Color,
		Icon:      optionalText(in.Icon),
	})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return db.Category{}, ErrCategoryNotFound
	case isUniqueViolation(err):
		return db.Category{}, ErrCategoryNameTaken
	}
	return cat, err
}

// Delete: los productos de la categoría NO se borran, se quedan "sin categoría".
func (s *CategoryService) Delete(ctx context.Context, projectID, id pgtype.UUID) error {
	n, err := s.q.DeleteCategory(ctx, db.DeleteCategoryParams{ProjectID: projectID, ID: id})
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrCategoryNotFound
	}
	return nil
}
