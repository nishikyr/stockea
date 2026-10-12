// Package web prepara Echo para producción: IP real detrás del proxy, cabeceras de seguridad
// y servir el frontend compilado (React) desde el mismo servidor que la API.
package web

import (
	"strings"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
)

// TrustProxy hace que c.RealIP() devuelva la IP del USUARIO y no la del proxy.
//
// En Fly.io, Railway, Render… las peticiones no llegan directas: pasan por su proxy, que añade
// la IP original en la cabecera X-Forwarded-For. Sin esto, Go vería a todo el mundo con la IP
// del proxy y el límite de 5 logins por minuto se compartiría entre TODOS (si alguien falla
// 5 veces, nadie podría entrar).
//
// ExtractIPFromXFFHeader recorre la cabecera de derecha a izquierda saltándose solo las IPs
// privadas (las de los proxies de confianza): un atacante no puede colar una IP falsa
// añadiéndola él mismo a la cabecera. Sin proxy delante (en local), usa la IP de la conexión.
func TrustProxy(e *echo.Echo) {
	e.IPExtractor = echo.ExtractIPFromXFFHeader()
}

// contentSecurityPolicy le dice al navegador de dónde puede cargar cosas la página.
// Si alguien consiguiera inyectar un <script> de otro sitio, el navegador se negaría a ejecutarlo.
//   - script-src 'self': solo nuestro JavaScript (Vite no mete scripts en línea).
//   - style-src … 'unsafe-inline': React usa style={{…}} (los colores de las categorías).
//   - fonts.googleapis.com / fonts.gstatic.com: las fuentes Bricolage y Figtree.
//   - img-src blob:: las vistas previas de las fotos antes de subirlas.
//   - frame-ancestors 'none': nadie puede meter Stockea dentro de un <iframe> (clickjacking).
const contentSecurityPolicy = "default-src 'self'; " +
	"script-src 'self'; " +
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
	"font-src 'self' https://fonts.gstatic.com; " +
	"img-src 'self' data: blob:; " +
	"connect-src 'self'; " +
	"frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

// SecurityHeaders añade las cabeceras de seguridad típicas a TODAS las respuestas.
// HSTS ("usa siempre HTTPS durante 2 años") solo en producción: en local no hay HTTPS.
func SecurityHeaders(e *echo.Echo, production bool) {
	cfg := echomw.SecureConfig{
		XSSProtection:         "",        // cabecera obsoleta; la sustituye la CSP
		ContentTypeNosniff:    "nosniff", // el navegador no "adivina" tipos de fichero
		XFrameOptions:         "DENY",    // igual que frame-ancestors, para navegadores antiguos
		ReferrerPolicy:        "same-origin",
		ContentSecurityPolicy: contentSecurityPolicy,
	}
	if production {
		cfg.HSTSMaxAge = 63072000 // 2 años
	}
	e.Use(echomw.SecureWithConfig(cfg))
}

// ServeFrontend sirve los ficheros de frontend/dist (el resultado de `npm run build`).
//
//   - /api/... no se toca: lo atienden las rutas de la API.
//   - Si el fichero existe (/assets/index-3f9a.js, /favicon.svg…) se envía tal cual.
//   - Si no existe (/projects/123/history) se envía index.html y React Router decide qué
//     pantalla mostrar. Es lo que significa HTML5: true ("modo SPA").
func ServeFrontend(e *echo.Echo, dir string) {
	isAPI := func(c echo.Context) bool { return strings.HasPrefix(c.Request().URL.Path, "/api") }

	// Caché: los ficheros de /assets/ llevan un hash en el nombre (index-3f9a.js) que cambia
	// en cada build, así que el navegador puede guardarlos para siempre. index.html, en cambio,
	// hay que pedirlo siempre: es el que apunta a los assets nuevos tras cada despliegue.
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if !isAPI(c) {
				if strings.HasPrefix(c.Request().URL.Path, "/assets/") {
					c.Response().Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				} else {
					c.Response().Header().Set("Cache-Control", "no-cache")
				}
			}
			return next(c)
		}
	})

	e.Use(echomw.StaticWithConfig(echomw.StaticConfig{
		Root:    dir,
		HTML5:   true,
		Skipper: isAPI,
	}))
}
