package services

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/db"
)

// Ubicaciones físicas del trastero. Se pueden anidar: "Estantería A" > "Caja 3".
type LocationService struct {
	q *db.Queries
}

func NewLocationService(q *db.Queries) *LocationService {
	return &LocationService{q: q}
}

type LocationInput struct {
	Name        string
	Description string
	ParentID    pgtype.UUID // Valid=false → ubicación de primer nivel
}

func (in *LocationInput) validate() error {
	in.Name = strings.TrimSpace(in.Name)
	switch {
	case in.Name == "" || len(in.Name) > 60:
		return validation("el nombre de la ubicación es obligatorio (máx. 60 caracteres)")
	case len(in.Description) > 500:
		return validation("la descripción no puede superar 500 caracteres")
	}
	return nil
}

func (s *LocationService) List(ctx context.Context, projectID pgtype.UUID) ([]db.ListLocationsRow, error) {
	return s.q.ListLocations(ctx, projectID)
}

func (s *LocationService) Create(ctx context.Context, projectID pgtype.UUID, in LocationInput) (db.Location, error) {
	if err := in.validate(); err != nil {
		return db.Location{}, err
	}
	if err := s.checkParentExists(ctx, projectID, in.ParentID); err != nil {
		return db.Location{}, err
	}
	return s.q.CreateLocation(ctx, db.CreateLocationParams{
		ProjectID:   projectID,
		ParentID:    in.ParentID,
		Name:        in.Name,
		Description: optionalText(in.Description),
	})
}

func (s *LocationService) Update(ctx context.Context, projectID, id pgtype.UUID, in LocationInput) (db.Location, error) {
	if err := in.validate(); err != nil {
		return db.Location{}, err
	}
	if err := s.checkParentExists(ctx, projectID, in.ParentID); err != nil {
		return db.Location{}, err
	}
	if in.ParentID.Valid {
		// El nuevo padre no puede ser ella misma ni algo que esté dentro de ella
		cycle, err := s.q.IsLocationOrDescendant(ctx, db.IsLocationOrDescendantParams{ID: id, Candidate: in.ParentID})
		if err != nil {
			return db.Location{}, err
		}
		if cycle {
			return db.Location{}, ErrLocationCycle
		}
	}

	loc, err := s.q.UpdateLocation(ctx, db.UpdateLocationParams{
		ProjectID:   projectID,
		ID:          id,
		ParentID:    in.ParentID,
		Name:        in.Name,
		Description: optionalText(in.Description),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return db.Location{}, ErrLocationNotFound
	}
	return loc, err
}

// Delete: las sububicaciones pasan a primer nivel y los productos se quedan "sin ubicación".
func (s *LocationService) Delete(ctx context.Context, projectID, id pgtype.UUID) error {
	n, err := s.q.DeleteLocation(ctx, db.DeleteLocationParams{ProjectID: projectID, ID: id})
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrLocationNotFound
	}
	return nil
}

func (s *LocationService) checkParentExists(ctx context.Context, projectID, parentID pgtype.UUID) error {
	if !parentID.Valid {
		return nil
	}
	_, err := s.q.GetLocation(ctx, db.GetLocationParams{ProjectID: projectID, ID: parentID})
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrLocationNotFound
	}
	return err
}
