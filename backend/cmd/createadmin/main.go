// Crea el usuario administrador. Uso (desde backend/):
//
//	go run ./cmd/createadmin -email tu@email.com -name Alejandro
//
// La contraseña se pide por la terminal para que no quede en el historial.
package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nishikyr/stockea/internal/config"
	"github.com/nishikyr/stockea/internal/db"
	"github.com/nishikyr/stockea/internal/services"
)

func main() {
	email := flag.String("email", "", "email del administrador")
	name := flag.String("name", "", "nombre visible")
	flag.Parse()
	if *email == "" || *name == "" {
		log.Fatal("uso: go run ./cmd/createadmin -email tu@email.com -name TuNombre")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Print("Contraseña (mínimo 10 caracteres): ")
	password, _ := bufio.NewReader(os.Stdin).ReadString('\n')
	password = strings.TrimSpace(password)

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	user, err := services.NewUserService(db.New(pool)).Create(ctx, services.CreateUserInput{
		Email:    *email,
		Name:     *name,
		Password: password,
		IsAdmin:  true,
	})
	if err != nil {
		log.Fatalf("no se pudo crear el usuario: %v", err)
	}
	fmt.Printf("✔ Admin creado: %s (%s)\n", user.Name, user.Email)
}
