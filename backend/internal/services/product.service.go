package services

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/nishikyr/stockea/internal/db"
	"github.com/nishikyr/stockea/internal/storage"
)

const maxQuantity = 1_000_000

type ProductService struct {
	pool  TxStarter
	q     *db.Queries
	store storage.Storage // para borrar las fotos del producto al borrarlo
}

func NewProductService(pool TxStarter, q *db.Queries, store storage.Storage) *ProductService {
	return &ProductService{pool: pool, q: q, store: store}
}

type ProductFilter struct {
	CategoryID   pgtype.UUID
	LocationID   pgtype.UUID
	Search       string
	LowStockOnly bool
}

type ProductInput struct {
	Name        string
	Description string
	CategoryID  pgtype.UUID // Valid=false → sin categoría
	LocationID  pgtype.UUID // Valid=false → sin ubicación
	Unit        string      // "uds", "cajas", "kg"...; vacío = "uds"
	MinQuantity int32       // por debajo (o igual) se marca como stock bajo
}

func (in *ProductInput) validate() error {
	in.Name = strings.TrimSpace(in.Name)
	in.Unit = strings.TrimSpace(in.Unit)
	if in.Unit == "" {
		in.Unit = "uds"
	}
	switch {
	case in.Name == "" || len(in.Name) > 100:
		return validation("el nombre del producto es obligatorio (máx. 100 caracteres)")
	case len(in.Description) > 1000:
		return validation("la descripción no puede superar 1000 caracteres")
	case len(in.Unit) > 20:
		return validation("la unidad no puede superar 20 caracteres")
	case in.MinQuantity < 0 || in.MinQuantity > maxQuantity:
		return validation("el stock mínimo no es válido")
	}
	return nil
}

func (s *ProductService) List(ctx context.Context, projectID pgtype.UUID, f ProductFilter) ([]db.ListProductsRow, error) {
	search := strings.TrimSpace(f.Search)
	return s.q.ListProducts(ctx, db.ListProductsParams{
		ProjectID:    projectID,
		CategoryID:   f.CategoryID,
		LocationID:   f.LocationID,
		Search:       pgtype.Text{String: escapeLike(search), Valid: search != ""},
		LowStockOnly: f.LowStockOnly,
	})
}

// Get devuelve el producto con su categoría y ubicación.
func (s *ProductService) Get(ctx context.Context, projectID, id pgtype.UUID) (db.ListProductsRow, error) {
	row, err := s.q.GetProductDetail(ctx, db.GetProductDetailParams{ProjectID: projectID, ID: id})
	if errors.Is(err, pgx.ErrNoRows) {
		return db.ListProductsRow{}, ErrProductNotFound
	}
	// Las dos consultas devuelven las mismas columnas, así que Go permite convertir un tipo en otro
	return db.ListProductsRow(row), err
}

// Create crea el producto y, si se indica un stock inicial, registra la entrada correspondiente.
// Todo en una transacción: o se guarda todo, o nada.
func (s *ProductService) Create(ctx context.Context, projectID pgtype.UUID, user db.User, in ProductInput, initialQuantity int32) (db.ListProductsRow, error) {
	if err := in.validate(); err != nil {
		return db.ListProductsRow{}, err
	}
	if initialQuantity < 0 || initialQuantity > maxQuantity {
		return db.ListProductsRow{}, validation("el stock inicial no es válido")
	}

	var productID pgtype.UUID
	err := withTx(ctx, s.pool, s.q, func(q *db.Queries) error {
		if err := checkReferences(ctx, q, projectID, in.CategoryID, in.LocationID); err != nil {
			return err
		}
		p, err := q.CreateProduct(ctx, db.CreateProductParams{
			ProjectID:   projectID,
			CategoryID:  in.CategoryID,
			LocationID:  in.LocationID,
			Name:        in.Name,
			Description: optionalText(in.Description),
			Unit:        in.Unit,
			MinQuantity: in.MinQuantity,
		})
		if err != nil {
			return err
		}
		productID = p.ID

		if initialQuantity > 0 {
			if err := q.SetProductQuantity(ctx, db.SetProductQuantityParams{ID: p.ID, Quantity: initialQuantity}); err != nil {
				return err
			}
			_, err = q.CreateMovement(ctx, db.CreateMovementParams{
				ProductID: p.ID,
				UserID:    user.ID,
				Type:      db.MovementTypeIn,
				Quantity:  initialQuantity,
				Reason:    optionalText("Stock inicial"),
			})
			return err
		}
		return nil
	})
	if err != nil {
		return db.ListProductsRow{}, err
	}
	return s.Get(ctx, projectID, productID)
}

// Update cambia los datos del producto. La cantidad no: solo cambia con movimientos.
func (s *ProductService) Update(ctx context.Context, projectID, id pgtype.UUID, in ProductInput) (db.ListProductsRow, error) {
	if err := in.validate(); err != nil {
		return db.ListProductsRow{}, err
	}
	if err := checkReferences(ctx, s.q, projectID, in.CategoryID, in.LocationID); err != nil {
		return db.ListProductsRow{}, err
	}
	_, err := s.q.UpdateProduct(ctx, db.UpdateProductParams{
		ProjectID:   projectID,
		ID:          id,
		CategoryID:  in.CategoryID,
		LocationID:  in.LocationID,
		Name:        in.Name,
		Description: optionalText(in.Description),
		Unit:        in.Unit,
		MinQuantity: in.MinQuantity,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return db.ListProductsRow{}, ErrProductNotFound
	}
	if err != nil {
		return db.ListProductsRow{}, err
	}
	return s.Get(ctx, projectID, id)
}

// Delete borra el producto junto con su historial de movimientos y sus fotos.
func (s *ProductService) Delete(ctx context.Context, projectID, id pgtype.UUID) error {
	// Primero apuntamos qué ficheros tiene: al borrar el producto, la BD borra sus filas de fotos
	photos, err := s.q.ListProductPhotos(ctx, id)
	if err != nil {
		return err
	}
	n, err := s.q.DeleteProduct(ctx, db.DeleteProductParams{ProjectID: projectID, ID: id})
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrProductNotFound // (y no tocamos ningún fichero)
	}
	for _, ph := range photos {
		_ = s.store.Delete(ctx, ph.StorageKey) // si alguno falla, solo queda un fichero sin usar
	}
	return nil
}

// checkReferences comprueba que la categoría y la ubicación existen Y son de este proyecto.
// Sin esto, alguien podría colgar su producto de una categoría de otro proyecto.
func checkReferences(ctx context.Context, q *db.Queries, projectID, categoryID, locationID pgtype.UUID) error {
	if categoryID.Valid {
		_, err := q.GetCategory(ctx, db.GetCategoryParams{ProjectID: projectID, ID: categoryID})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCategoryNotFound
		}
		if err != nil {
			return err
		}
	}
	if locationID.Valid {
		_, err := q.GetLocation(ctx, db.GetLocationParams{ProjectID: projectID, ID: locationID})
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrLocationNotFound
		}
		if err != nil {
			return err
		}
	}
	return nil
}
