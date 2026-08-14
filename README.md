# Hematopass

Ruta asistencial digital para hematología pediátrica. Una plataforma donde
el equipo clínico y la familia ven la misma ruta de atención, en tiempo
real, y donde el sistema detecta activamente a quién se está quedando
atrás — antes de que un viaje interprovincial se desperdicie.

Construido para la **Hackatón en Salud INSN San Borja 2026**, reto
*"Ruta Hematológica: continuidad y calidad para cada paciente"*.

> ⚠️ **Todos los datos de este repositorio son sintéticos.** Ningún nombre,
> identificador ni dato clínico real ha ingresado nunca a este sistema.
> Ver [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md) §5.

---

## Por qué existe

54% de los pacientes hospitalizados en el INSN San Borja provienen de fuera
de Lima. ~41% del abandono de tratamiento hematológico pediátrico en
Latinoamérica tiene causa económica o de transporte. La mayoría de esos
abandonos no son una decisión — son la acumulación de viajes
interprovinciales desperdiciados porque un resultado de laboratorio no
estuvo listo a tiempo.

Hematopass no es una app de recordatorios. Es un sistema que:

1. Traduce cada paso clínico a una instrucción que un cuidador entiende
   ("Farmacia, ventanilla 2", no "dispensación de inmunosupresores").
2. Valida físicamente cada paso con un QR estático de bajo costo — sin
   hardware nuevo.
3. Detecta el riesgo de abandono con reglas explicables, **antes** de que
   ocurra — no solo después.

La metáfora del producto: cada QR escaneado es un sello en el pasaporte
del tratamiento. Ver [`docs/sistema-de-diseno.md`](docs/sistema-de-diseno.md).

## Levantar el proyecto

Requiere [Docker](https://docs.docker.com/get-docker/) y Docker Compose v2.

```bash
cp .env.example .env
# genera un valor real para AUTH_SECRET dentro de .env:
#   npx auth secret   (o: openssl rand -base64 33)
docker compose up --build
```

Eso levanta Postgres, aplica el esquema, siembra los 24 pacientes
sintéticos, y arranca la app detrás de Caddy en `http://localhost`.

Usuarios de demo (ver [`src/db/seed.ts`](src/db/seed.ts) para la lista
completa y sus contraseñas):

| Rol | Correo |
|---|---|
| Médico | `medico@demo.hematopass.pe` |
| Gestor de casos | `gestor@demo.hematopass.pe` |
| Ventanilla | `ventanilla@demo.hematopass.pe` |
| Admin | `admin@demo.hematopass.pe` |

### Desarrollo sin Docker

```bash
cp .env.example .env.local
npm install
# necesita un Postgres accesible en DATABASE_URL (ver .env.local)
npx drizzle-kit push
npx tsx src/db/seed.ts
npm run dev
```

## Arquitectura, en una frase

Todo corre en contenedores sobre PostgreSQL con primitivas portables — nada
del código conoce a AWS. El mismo `docker-compose.yml` que despliega en EC2
correría, sin cambios, en un servidor del INSNSB. Ver
[`docs/arquitectura.md`](docs/arquitectura.md) para la justificación
completa (las bases del hackatón exigen que la solución no dependa de
infraestructura privada no replicable — punto 11.1).

| Capa | Tecnología |
|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript |
| Base de datos | PostgreSQL 17 + Drizzle ORM |
| Auth | Auth.js (Credentials ahora, OIDC/Keycloak documentado como ruta de producción) |
| Tiempo real | SSE + Postgres `LISTEN/NOTIFY` |
| UI | Tailwind CSS v4 + Radix primitives, sin librería de componentes |
| Despliegue | Docker Compose + Caddy (TLS automático) |

## Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md) — decisiones técnicas y justificación
- [`docs/sistema-de-diseno.md`](docs/sistema-de-diseno.md) — tokens, tipografía, la metáfora del sello
- [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md) — fases de construcción, motor de riesgo, datos sintéticos
- [`docs/modelo-de-datos.md`](docs/modelo-de-datos.md) — esquema completo
- [`docs/despliegue.md`](docs/despliegue.md) — AWS y on-premise

## Componentes abiertos y reutilizables

Este repositorio se publica bajo licencia MIT (ver [`LICENSE`](LICENSE)).
Los componentes de terceros están identificados en [`NOTICE`](NOTICE),
conforme al punto 11.1 de las bases del hackatón. El motor de riesgo
([`docs/motor-de-riesgo.md`](docs/motor-de-riesgo.md)) documenta cada regla
y su umbral configurable, pensado para que otro hospital pueda ajustarlos
sin tocar código.

## Estado

Prototipo de hackatón. Ver el checklist de fases en
[`docs/plan-desarrollo.md`](docs/plan-desarrollo.md) §2 para lo que está
construido y lo que queda como *próximos pasos* declarados.

## Licencia

MIT. Ver [`LICENSE`](LICENSE) y [`NOTICE`](NOTICE).
