# Despliegue

## Principio

El mismo `docker-compose.yml` es el artefacto de despliegue en AWS y el
artefacto que un hospital podría correr on-premise. No hay una versión
"de nube" y otra "portable" — solo hay una. Ver
[`arquitectura.md`](arquitectura.md) §2 para la justificación frente a las
bases del hackatón (punto 11.1: no depender de infraestructura privada no
replicable).

## AWS — EC2 + Docker Compose (recomendado para el demo)

```
EC2 t3.small  →  Docker Compose
                 ├── caddy      (TLS automático, reverse proxy)
                 ├── app        (Next.js standalone)
                 ├── postgres   (con volumen persistente)
                 └── migrate    (aplica esquema + siembra datos, corre una vez)
```

### Pasos

1. Lanzar una instancia EC2 (Amazon Linux 2023 o Ubuntu 22.04+, t3.small,
   20GB de disco). Abrir puertos 80 y 443 en el security group.
2. Instalar Docker y el plugin de Compose:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # el plugin `docker compose` viene incluido en instalaciones recientes
   ```
3. Clonar el repositorio y configurar el entorno:
   ```bash
   git clone <url-del-repo> hematopass && cd hematopass
   cp .env.example .env
   # generar AUTH_SECRET real: pnpm dlx auth secret (requiere Node) u openssl rand -base64 33
   # si hay dominio propio, fijar SITE_ADDRESS=hematopass.tudominio.org
   ```
4. Levantar:
   ```bash
   docker compose up -d --build
   ```
5. (Opcional) Apuntar un registro A de Route 53 al Elastic IP de la
   instancia. Con `SITE_ADDRESS` como dominio, Caddy emite TLS
   automáticamente en el primer arranque — sin configuración adicional.

### Costo aproximado

Un t3.small cubre cómodamente la demo y un piloto de pocos usuarios
concurrentes. Referencia de precio: consultar la calculadora de AWS al
momento del despliegue (varía por región).

## Ruta de escalamiento (documentada, no construida para el demo)

Para producción real, con más de un servicio del hospital:

```
ALB → ECS Fargate (2+ tareas) → RDS PostgreSQL (Multi-AZ)
                                → S3 (adjuntos, si se agregan)
                                → CloudFront + WAF
```

El código de la aplicación no cambia: `DATABASE_URL` pasa a apuntar a RDS,
y el contenedor `app` (mismo `Dockerfile`, stage `runtime`) se despliega en
Fargate en lugar de en una VM. `migrate` se ejecuta como una tarea de un
solo uso en cada release. No hay reescritura — es el mismo artefacto en
más infraestructura.

## On-premise / INSN San Borja

Exactamente los mismos pasos que en EC2, sobre cualquier servidor Linux
con Docker: `git clone`, `.env`, `docker compose up -d --build`. Sin nube,
sin tarjeta de crédito, sin dependencia de un proveedor externo continuo.
Esta equivalencia es el argumento central de viabilidad del proyecto, no
un detalle técnico incidental.

## Variables de entorno requeridas

Ver [`.env.example`](../.env.example) para la lista completa y comentada.
Las únicas que **deben** cambiarse en cualquier despliegue real:
`AUTH_SECRET` y `POSTGRES_PASSWORD`.
