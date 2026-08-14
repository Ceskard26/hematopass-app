import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit precarga su propio dotenv de `.env` ANTES de que este archivo
// se ejecute — por eso `override: true` es obligatorio aquí: sin él, dotenv
// ve DATABASE_URL ya presente (con el valor de `.env`, pensado solo para
// Docker) y no lo reemplaza con el de `.env.local`. Root `.env` nunca se
// carga de forma explícita aquí a propósito, por la misma razón.
config({ path: ".env.local", override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida. Copia .env.example a .env.local.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
