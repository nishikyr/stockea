# Stockea

Inventario visual de trasteros, organizado por proyectos (ej. "HomeBox Atocha - Madrid") y compartido con otras personas según su rol.

## Stack
- **Backend:** Go + Echo, PostgreSQL (pgx), consultas tipadas con sqlc, migraciones con goose
- **Frontend:** React + Vite + Tailwind (pendiente)
- **Fotos:** Cloudflare R2 / AWS S3 (pendiente)

## Estructura
```
stockea/
├── docker-compose.yml               # Postgres local (puerto 5433)
└── backend/
    ├── cmd/
    │   ├── api/main.go              # arranque: config → BD → services → handlers → rutas
    │   └── createadmin/main.go      # crea el usuario administrador
    ├── db/
    │   ├── migrations/              # esquema SQL (goose)
    │   └── queries/                 # consultas SQL por entidad → sqlc genera Go
    └── internal/
        ├── config/                  # lee y valida el .env
        ├── db/                      # generado por sqlc (modelos + consultas) — no editar
        ├── auth/                    # bcrypt + tokens de sesión
        ├── storage/                 # dónde se guardan las fotos (hoy: disco local)
        ├── middleware/              # sesión, admin, rol de proyecto
        ├── services/                # lógica de negocio y validaciones
        ├── handlers/                # HTTP: request → service → respuesta JSON
        ├── dto/                     # formas de entrada/salida de la API
        └── routes/routes.go         # todas las rutas en un sitio
```

Cada capa solo habla con la de debajo: **routes → handlers → services → db**.
Los services devuelven errores de negocio (`services/errors.go`) y `handlers/error.handler.go`
los convierte en el código HTTP adecuado con un JSON `{"message": "..."}`.

## Modelo de datos
- `users` — `is_admin` = administrador global (crea proyectos y usuarios)
- `sessions` — sesiones activas (solo el hash SHA-256 del token)
- `projects` + `project_members` — cada usuario tiene rol `editor` o `viewer` por proyecto
- `categories`, `locations` (anidables: Estantería > Caja, con `qr_code`)
- `products` — `quantity` y `min_quantity` (alerta de stock bajo)
- `product_photos` — solo la clave del fichero; la imagen va en `storage/` (carpeta `UPLOAD_DIR`)
- `movements` — historial de entradas/salidas/ajustes (quién, cuándo, por qué)

Regla de oro: `products.quantity` solo cambia junto con un `movement`, en la misma transacción.

## Sesiones
Las sesiones se guardan **en el servidor**, no en localStorage:
1. Al hacer login se genera un token aleatorio de 256 bits.
2. El navegador lo recibe en una cookie `stockea_session` con `HttpOnly` (JavaScript no puede leerla),
   `SameSite=Lax` y, en producción, `Secure` (solo HTTPS).
3. En la tabla `sessions` se guarda solo su **hash**: si alguien leyera la BD no podría usar las sesiones.
4. En cada petición se busca el hash en la BD. El logout borra la fila, así que la sesión muere al instante.

## Arrancar en local (Windows / PowerShell)
```powershell
# 1. Herramienta de migraciones (una vez)
go install github.com/pressly/goose/v3/cmd/goose@latest

# 2. Base de datos (desde Stockea/, con Docker Desktop abierto)
docker compose up -d

# 3. Migraciones (desde backend/)
cd backend
copy .env.example .env
goose -dir db/migrations postgres "postgres://stockea:stockea@localhost:5433/stockea?sslmode=disable" up

# 4. Si cambias algún .sql de db/queries, regenera el código Go
docker run --rm -v "${PWD}:/src" -w /src sqlc/sqlc generate

# 5. Arrancar
go run ./cmd/api
# → http://localhost:8080/api/health
```

## Crear el usuario administrador
```powershell
go run ./cmd/createadmin -email tu@email.com -name TuNombre
# te pedirá la contraseña (mínimo 10 caracteres)
```

## API
Todas las respuestas son JSON. Los errores tienen la forma `{"message": "..."}`.

### Autenticación
| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| POST | `/api/auth/login` | todos | `{email, password}` → crea la sesión (máx. 5 intentos seguidos por IP) |
| POST | `/api/auth/logout` | todos | borra la sesión |
| GET | `/api/auth/me` | con sesión | tus datos |
| PUT | `/api/auth/password` | con sesión | `{current_password, new_password}` → cambia tu contraseña y cierra tus otras sesiones |

### Usuarios
| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| GET | `/api/users` | admin | lista de usuarios |
| POST | `/api/users` | admin | `{email, name, password}` → crea una cuenta normal |
| PUT | `/api/users/:userID/password` | admin | `{new_password}` → pone una contraseña nueva y cierra sus sesiones |

### Proyectos
| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| GET | `/api/projects` | con sesión | tus proyectos con tu rol y contadores (`product_count`, `low_stock_count`, `member_count`). El admin ve todos |
| POST | `/api/projects` | admin | `{name, description}` → crea un proyecto |
| GET | `/api/projects/:projectID` | miembro | detalle del proyecto |
| PUT | `/api/projects/:projectID` | admin | `{name, description}` → edita el proyecto |
| GET | `/api/projects/:projectID/members` | admin | miembros y sus roles |
| PUT | `/api/projects/:projectID/members` | admin | `{email, role}` → añade un miembro o cambia su rol (`editor` / `viewer`) |
| DELETE | `/api/projects/:projectID/members/:userID` | admin | quita el acceso |

Si no eres miembro de un proyecto, la API responde 404 (no 403) para no revelar que existe.

### Roles
| En el código | En pantalla | Qué puede hacer |
|---|---|---|
| `is_admin` (cuenta) | Administrador | Todo, en todos los proyectos: crear proyectos y cuentas, dar accesos |
| `editor` | Técnico de mantenimiento | En su proyecto: productos, fotos, categorías, ubicaciones y movimientos |
| `viewer` | Solo ver | En su proyecto: consultar todo (fotos e historial incluidos) |

### Inventario
Todas cuelgan de `/api/projects/:projectID`. **Leer**: cualquier miembro. **Modificar**: editor o admin.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/categories` | categorías con nº de productos |
| POST / PUT / DELETE | `/categories[/:categoryID]` | `{name, color: "#rrggbb", icon}`. Al borrar, sus productos quedan sin categoría |
| GET | `/locations` | ubicaciones (lista plana con `parent_id`; el frontend monta el árbol) |
| POST / PUT / DELETE | `/locations[/:locationID]` | `{name, description, parent_id}`. Impide ciclos (una caja dentro de sí misma) |
| GET | `/products?category_id=&location_id=&q=&low_stock=true` | listado con filtros opcionales |
| GET | `/products/:productID` | detalle, con todas sus `photos` |
| POST | `/products` | `{name, description, category_id, location_id, unit, min_quantity, quantity}`; `quantity` = stock inicial |
| PUT | `/products/:productID` | edita los datos; **la cantidad no** (solo cambia con movimientos) |
| DELETE | `/products/:productID` | borra el producto y su historial |
| POST | `/products/:productID/movements` | `{type, quantity, reason}` → ver tabla de abajo |
| POST | `/movements/batch` | `{type: "in"\|"out", reason, items: [{product_id, quantity}]}` → varias cosas a la vez, **todo o nada** |
| POST | `/products/:productID/photos` | formulario `multipart` con el campo `photo` (JPG, PNG o WEBP, máx. 10 MB, máx. 10 por producto) |
| GET | `/products/:productID/photos/:photoID` | la imagen (solo miembros del proyecto) |
| DELETE | `/products/:productID/photos/:photoID` | borra la foto |
| GET | `/movements?product_id=&type=out&limit=50&offset=0` | historial, lo más reciente primero |

| `type` | `quantity` significa | Ejemplo |
|---|---|---|
| `in` | unidades que entran | compras 4 bombillas → `{type:"in", quantity:4}` |
| `out` | unidades que salen | te llevas 2 → `{type:"out", quantity:2}` (falla con 409 si no hay suficientes) |
| `adjust` | cuántas hay de verdad tras contarlas | cuentas 6 → `{type:"adjust", quantity:6}`; se guarda la diferencia |

Cada movimiento actualiza el stock y se guarda en el historial **en la misma transacción**, con la fila
del producto bloqueada (`FOR UPDATE`): aunque dos personas registren salidas a la vez, el stock nunca
queda negativo ni descuadrado. Cada movimiento devuelve el `delta` (+4, -2...) y el stock resultante.

En `/movements/batch`, si a un solo producto le falta stock no se mueve ninguno y el error dice cuál
(`"Bombillas: no hay suficiente stock (quedan 1 uds)"`). Los productos se bloquean siempre en el mismo
orden, así que dos salidas múltiples simultáneas nunca se quedan esperándose la una a la otra (deadlock).

Cada producto devuelve `photo_url` (su foto de portada, o `null`), lista para usar en `<img src>`.

## Próximos pasos
1. ~~Login con sesiones en servidor y cookie HttpOnly~~ ✔
2. ~~Permisos por proyecto (admin / editor / viewer)~~ ✔
3. ~~Usuarios, proyectos y miembros~~ ✔
4. ~~Categorías, ubicaciones, productos y movimientos~~ ✔
5. ~~Salida múltiple, fotos, editar proyecto, contraseñas~~ ✔
6. Frontend React
7. Deploy (Fly.io / Railway) + GitHub Actions — y llevar las fotos a R2/S3 o a un volumen persistente
8. Solicitudes: quien tiene "Solo ver" pide sacar o enviar cosas y el admin lo aprueba
