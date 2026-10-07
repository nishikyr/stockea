# stockea

Inventario visual del trastero, compartido por proyectos (ej. "stockea Atocha - Madrid").

## Stack
- **Backend:** Go + Echo, PostgreSQL (pgx), consultas tipadas con sqlc, migraciones con goose
- **Frontend:** React + Vite + Tailwind (pendiente)
- **Fotos:** Cloudflare R2 / AWS S3 (pendiente)

## Estructura
```
stockea/
├── docker-compose.yml        # Postgres local
├── backend/
│   ├── cmd/api/main.go       # punto de entrada de la API
│   ├── db/migrations/        # esquema SQL (goose)
│   ├── db/queries/           # consultas SQL → sqlc genera Go
│   ├── internal/db/          # código generado por sqlc (no editar)
│   └── sqlc.yaml
└── frontend/                 # (siguiente paso)
```

## Modelo de datos
- `users` — `is_admin` = administrador global (crea proyectos y usuarios)
- `projects` + `project_members` — cada usuario tiene rol `editor` o `viewer` por proyecto
- `categories`, `locations` (anidables: Estantería > Caja, con `qr_code`)
- `products` — `quantity` y `min_quantity` (alerta de stock bajo)
- `product_photos` — solo la clave del fichero en R2/S3
- `movements` — historial de entradas/salidas/ajustes (quién, cuándo, por qué)

Regla de oro: `products.quantity` solo cambia junto con un `movement`, en la misma transacción.

## Arrancar en local
```bash
# 1. Herramientas (una vez)
go install github.com/pressly/goose/v3/cmd/goose@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# 2. Base de datos
docker compose up -d

# 3. Migraciones
cd backend
cp .env.example .env
goose -dir db/migrations postgres "postgres://stockea:stockea@localhost:5433/stockea?sslmode=disable" up

# 4. Dependencias, generar código y arrancar
go mod tidy
sqlc generate
export $(cat .env | xargs) && go run ./cmd/api
# → http://localhost:8080/api/health
```

## Crear el usuario administrador
```bash
cd backend
go run ./cmd/createadmin -email tu@email.com -name TuNombre
# te pedirá la contraseña (mínimo 10 caracteres)
```

## API de autenticación
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/login` | `{email, password}` → cookie de sesión `stockea_session` (HttpOnly, 7 días) |
| POST | `/api/auth/logout` | borra la cookie |
| GET | `/api/auth/me` | datos del usuario logueado (requiere sesión) |

El login está limitado a 5 intentos seguidos por IP.

## Próximos pasos
1. ~~Auth: login con email/contraseña (bcrypt) + JWT en cookie httpOnly~~ ✔
2. ~~Middleware de permisos por proyecto (admin / editor / viewer)~~ ✔
3. Endpoints CRUD de productos, categorías y movimientos
4. Frontend React
5. Fotos (R2/S3)
6. Deploy (Fly.io / Railway) + GitHub Actions
