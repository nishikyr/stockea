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
	"github.com/joho/godotenv"

	"github.com/nishikyr/stockea/internal/auth"
	"github.com/nishikyr/stockea/internal/db"
)

func main() {
	_ = godotenv.Load()

	email := flag.String("email", "", "email del administrador")
	name := flag.String("name", "", "nombre visible")
	flag.Parse()
	if *email == "" || *name == "" {
		log.Fatal("uso: go run ./cmd/createadmin -email tu@email.com -name TuNombre")
	}

	fmt.Print("Contraseña (mínimo 10 caracteres): ")
	password, _ := bufio.NewReader(os.Stdin).ReadString('\n')
	password = strings.TrimSpace(password)
	if len(password) < 10 {
		log.Fatal("la contraseña debe tener al menos 10 caracteres")
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	user, err := db.New(pool).CreateUser(ctx, db.CreateUserParams{
		Email:        *email,
		PasswordHash: hash,
		Name:         *name,
		IsAdmin:      true,
	})
	if err != nil {
		log.Fatalf("no se pudo crear el usuario: %v", err)
	}
	fmt.Printf("✔ Admin creado: %s (%s)\n", user.Name, user.Email)
}
