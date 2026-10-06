-- +goose Up
-- Esquema inicial de stockea
-- gen_random_uuid() viene incluido en PostgreSQL 13+

-- Roles dentro de un proyecto
CREATE TYPE project_role AS ENUM ('editor', 'viewer');

-- Tipos de movimiento de stock
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjust');

-- ─────────────────────────────────────────────
-- Usuarios
-- is_admin = administrador global (crea proyectos y usuarios)
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Proyectos (ej. "stockea Atocha - Madrid")
-- ─────────────────────────────────────────────
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Qué usuarios ven qué proyecto y con qué permisos
CREATE TABLE project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       project_role NOT NULL DEFAULT 'viewer',
    PRIMARY KEY (project_id, user_id)
);

-- ─────────────────────────────────────────────
-- Categorías (Herramientas, Ropa, Navidad...)
-- ─────────────────────────────────────────────
CREATE TABLE categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#64748b', -- para la UI
    icon       TEXT,                            -- nombre de icono, ej. "wrench"
    UNIQUE (project_id, name)
);

-- ─────────────────────────────────────────────
-- Ubicaciones físicas: estantería, caja, balda...
-- parent_id permite anidar: Estantería A > Caja 3
-- qr_code es el código impreso en la etiqueta
-- ─────────────────────────────────────────────
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    description TEXT,
    qr_code     TEXT UNIQUE
);

-- ─────────────────────────────────────────────
-- Productos
-- quantity se actualiza SOLO junto a un movimiento (en la misma transacción)
-- ─────────────────────────────────────────────
CREATE TABLE products (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
    location_id  UUID REFERENCES locations(id) ON DELETE SET NULL,
    name         TEXT NOT NULL,
    description  TEXT,
    quantity     INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit         TEXT NOT NULL DEFAULT 'uds',
    min_quantity INTEGER NOT NULL DEFAULT 0 CHECK (min_quantity >= 0), -- alerta de stock bajo
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_project  ON products(project_id);
CREATE INDEX idx_products_category ON products(category_id);

-- ─────────────────────────────────────────────
-- Fotos (el fichero va a R2/S3, aquí solo la clave)
-- ─────────────────────────────────────────────
CREATE TABLE product_photos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0, -- orden en la galería
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Historial de movimientos
-- in/out: quantity > 0 ; adjust: la diferencia aplicada (puede ser negativa)
-- ─────────────────────────────────────────────
CREATE TABLE movements (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id),
    type       movement_type NOT NULL,
    quantity   INTEGER NOT NULL CHECK (quantity <> 0),
    reason     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_product ON movements(product_id, created_at DESC);

-- +goose Down
DROP TABLE movements;
DROP TABLE product_photos;
DROP TABLE products;
DROP TABLE locations;
DROP TABLE categories;
DROP TABLE project_members;
DROP TABLE projects;
DROP TABLE users;
DROP TYPE movement_type;
DROP TYPE project_role;
