# syntax=docker/dockerfile:1
#
# Imagen de producción de Stockea, en 3 etapas ("multi-stage build"):
#   1. web  → compila el frontend React (Node)   → frontend/dist
#   2. api  → compila el backend Go + goose       → binarios estáticos
#   3. final→ imagen mínima con SOLO lo necesario para ejecutar (sin Node, sin Go, sin código fuente)
#
# Construir:  docker build -t stockea .
# (ver README → "Probar la imagen de producción en local")

# ── 1. Frontend ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS web
WORKDIR /web
# Primero solo package*.json: si no cambian, Docker reutiliza la capa de "npm ci" (build mucho más rápido)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── 2. Backend ────────────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS api
WORKDIR /src
# Igual que arriba: las dependencias se descargan en una capa aparte y se cachean
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
# CGO_ENABLED=0 → binario 100 % estático (no necesita librerías del sistema)
# -trimpath -ldflags="-s -w" → sin rutas locales ni símbolos de depuración: más pequeño
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/createadmin ./cmd/createadmin
# goose (las migraciones) solo con el driver de Postgres: las etiquetas no_* quitan el resto
RUN CGO_ENABLED=0 go install -trimpath -ldflags="-s -w" \
    -tags='no_clickhouse no_libsql no_mssql no_mysql no_sqlite3 no_vertica no_ydb' \
    github.com/pressly/goose/v3/cmd/goose@v3.26.0 \
 && cp /go/bin/goose /out/goose
# Carpeta para las fotos. La imagen final no tiene shell para hacer "mkdir", así que la creamos aquí
RUN mkdir -p /data/uploads

# ── 3. Imagen final ───────────────────────────────────────────────────────────
# distroless: sin shell ni gestor de paquetes. Menos cosas dentro = menos que atacar.
# :nonroot → el proceso NO corre como root.
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=api /out/ /app/
COPY --from=web /web/dist /app/public
COPY backend/db/migrations /app/migrations
# 65532 = el usuario "nonroot" de distroless: así puede escribir las fotos
COPY --from=api --chown=65532:65532 /data /data

ENV APP_ENV=production \
    PORT=8080 \
    STATIC_DIR=/app/public \
    UPLOAD_DIR=/data/uploads \
    GOOSE_DRIVER=postgres \
    GOOSE_MIGRATION_DIR=/app/migrations

EXPOSE 8080
USER nonroot
ENTRYPOINT ["/app/api"]
