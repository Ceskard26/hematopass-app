# Arquitectura y stack — Plataforma de Ruta Hematológica

Estado: propuesta para aprobación. **No se ha escrito código.**

---

## 1. Qué es

Una plataforma centralizada donde **el equipo clínico y la familia ven la misma ruta de
atención, en tiempo real**, y donde el sistema detecta activamente a quien se está quedando
atrás.

Tres usuarios, tres necesidades distintas:

| Usuario | Qué necesita | Qué NO necesita |
|---|---|---|
| **Médico hematólogo** | Registrar el siguiente paso en 2 clics; ver el estado real del paciente sin llamar a nadie | Otro sistema donde teclear lo que ya teclea |
| **Gestor de casos / enfermería** | Una bandeja priorizada de quién está en riesgo de abandonar, y con quién ya se contactó | Un reporte mensual en PDF |
| **Cuidador (padre/madre)** | Saber qué sigue, dónde, cuándo, y si vale la pena viajar | Una app que instalar, una cuenta que crear, datos que gastar |

El niño es un usuario secundario, no el principal. La gamificación existe para reducir su
ansiedad, no para sostener la adherencia — esa decisión la toma el adulto.

---

## 2. Decisión crítica: AWS sí, pero portable

**Conflicto real con las bases.** El Anexo 1 obliga a declarar que la solución
*"no depende exclusivamente de software propietario restrictivo, servicios comerciales
cerrados o infraestructura privada no replicable"*, y el punto 11.1 exige publicar los
componentes bajo licencia abierta con enlace público.

Una arquitectura Lambda + DynamoDB + Cognito + SNS **incumple eso literalmente** y además es
imposible de replicar en el datacenter del INSNSB.

**La decisión:** desplegamos en AWS, pero usando **solo primitivas portables**. Todo corre en
contenedores sobre Postgres. Nada del código conoce a AWS.

| ❌ Evitamos | ✅ Usamos | Porque |
|---|---|---|
| DynamoDB | PostgreSQL (RDS o contenedor) | Estándar, replicable, relacional — la ruta ES un grafo de estados |
| Cognito | OIDC (Auth.js → Keycloak) | Portable a cualquier proveedor de identidad |
| Lambda + API Gateway | Contenedor Docker | Corre igual en AWS, en IBM Cloud y en un servidor del hospital |
| SNS / AppSync | SSE sobre Postgres LISTEN/NOTIFY | Sin vendor, sin costo por mensaje |
| S3 SDK directo | Interfaz de storage con driver S3 | Cambiable a disco local o MinIO |

**Esto deja de ser una concesión y se convierte en argumento de pitch:**

> "Hoy corre en AWS. Mañana corre en el servidor del INSNSB con el mismo `docker compose up`,
> sin reescribir una línea. La sostenibilidad no depende de que alguien siga pagando una nube."

Eso ataca directamente el criterio de **Viabilidad técnica y económica (20%)**, que es donde
más proyectos de hackatón se caen.

---

## 3. Stack recomendado

| Capa | Tecnología | Por qué esta y no otra |
|---|---|---|
| **App (ambas caras)** | **Next.js 16 (App Router) + React 19 + TypeScript** | Un solo repo, un solo deploy, dos superficies. Server Components para el dashboard denso, PWA para el cuidador. `output: 'standalone'` → contenedor de ~150MB |
| **Base de datos** | **PostgreSQL 17** | La ruta es una máquina de estados con auditoría. Relacional, transaccional, con `LISTEN/NOTIFY` gratis para el tiempo real |
| **Acceso a datos** | **Drizzle ORM** | Migraciones versionadas en el repo (auditable), SQL explícito, sin capa mágica que oculte queries en un demo |
| **Autenticación** | **Auth.js (OIDC-ready)** | Rápido ahora, y como habla OIDC se cambia a **Keycloak** sin tocar la app. Keycloak va documentado como la ruta institucional |
| **Tiempo real** | **SSE + Postgres LISTEN/NOTIFY** | Unidireccional (servidor → cuidador) es exactamente lo que necesitamos. Sin WebSocket, sin infra extra, sobrevive detrás de cualquier proxy |
| **Offline** | **PWA + Service Worker + IndexedDB (cola de operaciones)** | El escaneo de QR debe funcionar sin señal en un sótano del hospital y sincronizar después |
| **UI** | **Tailwind CSS v4 + Radix primitives** | Radix da accesibilidad real (teclado, ARIA) sin imponer estética. **Sin shadcn por defecto** — eso es lo que hace que todo se vea igual |
| **Gráficos** | **Visx o SVG propio** | Nada de librerías de dashboard genéricas |
| **QR** | `html5-qrcode` (lectura) + `qrcode` (generación) | Cámara del navegador, sin app nativa, sin hardware nuevo |
| **Contenedor** | **Docker + Docker Compose** | Es el artefacto que se entrega al hospital |
| **Proxy/TLS** | **Caddy** | TLS automático en una línea |
| **Notificaciones** | Interfaz abstracta + driver simulado en demo; driver SMS/WhatsApp opcional | El costo por mensaje no puede bloquear la demo |

**Versiones exactas se fijan al iniciar el repo.** Si alguna no está disponible, se baja a la
estable anterior sin cambiar la arquitectura.

---

## 4. Despliegue en AWS

**Para el demo (recomendado):**

```
EC2 t3.small  →  Docker Compose
                 ├── caddy      (TLS, reverse proxy)
                 ├── app        (Next.js standalone)
                 └── postgres   (con volumen persistente)
Route 53 → dominio propio
```

Barato, levanta en minutos, y **es exactamente el mismo compose que correría en el INSNSB**.
Esa equivalencia es el argumento, no un atajo.

**Ruta de escalamiento documentada (no la construimos ahora):**
ECS Fargate + RDS Postgres Multi-AZ + S3 + CloudFront + WAF. Se describe en el pitch como
plan de producción, con costos estimados.

**Nota:** si en algún momento quieres velocidad de iteración sobre control, Next.js también
corre en Vercel sin cambios. Lo menciono solo como salida de emergencia — para este proyecto
la portabilidad vale más.

---

## 5. Modelo de dominio (conceptual)

Alineado con HL7 FHIR en nomenclatura, **sin montar un servidor FHIR** (demasiado peso para el
tiempo disponible). Se expone un endpoint de solo lectura con forma FHIR para demostrar
interoperabilidad.

| Entidad | Equivalente FHIR | Qué representa |
|---|---|---|
| `Paciente` | `Patient` | Niño en tratamiento. **Datos sintéticos únicamente** |
| `Cuidador` | `RelatedPerson` | Quien opera la app. Puede tener varios pacientes (hermanos) |
| `Ruta` | `CarePlan` | El plan de atención activo del paciente |
| `Paso` | `Task` | Unidad atómica: "ir a Farmacia a recoger inmunosupresores" |
| `Ubicacion` | `Location` | Ventanilla física con su QR (Farmacia, Lab, Caja SIS, Consultorio 3) |
| `Evento` | `Provenance` | Bitácora inmutable: quién hizo qué, cuándo, desde dónde |
| `Alerta` | `Flag` | Señal de riesgo de abandono generada por el motor |
| `Contacto` | `Communication` | Intento de recontacto y su resultado |

**Estados de un `Paso`:** `programado → notificado → en_curso → completado`
con salidas laterales a `vencido`, `reprogramado`, `no_asistio`.

Todo cambio de estado escribe en `Evento`. **La bitácora es la fuente de verdad**, no el estado
actual. Esto da auditoría médico-legal y permite reconstruir la ruta completa — y es lo que
alimenta las métricas de impacto.

---

## 6. Superficies del producto

### A. Dashboard clínico (escritorio, denso)
1. **Lista de pacientes del día** — con estado de ruta visible sin abrir nada
2. **Ficha de paciente** — línea de tiempo de la ruta, no un formulario
3. **Generar siguiente paso** — destino + acción, 2 clics, plantillas frecuentes
4. **Resultados pendientes** — qué labs faltan y desde cuándo *(el acoplamiento crítico)*

### B. Bandeja de riesgo (el diferenciador)
5. **Pacientes en riesgo de abandono**, ordenados, con el motivo explícito
6. **Registro de recontacto** — quién llamó, qué pasó, siguiente acción

### C. App del cuidador (móvil, PWA)
7. **Pantalla "AHORA"** — un solo paso, enorme, sin menú. Qué, dónde, cuándo
8. **Escanear QR** — botón único, funciona offline
9. **Mi ruta** — pasado y futuro, para entender el tratamiento completo
10. **¿Debo viajar?** — estado de resultados y confirmación de cita *(ataca el 54% de provincia)*
11. **Señales de alarma** — fiebre, sangrado, palidez. Contenido clínico validado

### D. Panel de impacto (para el jurado y para el hospital)
12. **Métricas**: tasa de abandono, pasos vencidos, viajes desperdiciados evitados,
    tiempo entre pasos, recontactos exitosos

---

## 7. Decisiones técnicas puntuales

**Motor de riesgo — reglas, no ML.** Explicable, auditable, sin datos de entrenamiento (que no
tenemos y que sería ilegal usar). Reglas iniciales:
- paso vencido > 48h sin cierre
- 2 inasistencias consecutivas
- resultado listo sin cita de seguimiento agendada
- procedencia de provincia + cita reprogramada
- ≥ 4 semanas sin actividad → **abandono según definición SIOP-PODC**

Cada alerta muestra **por qué** se disparó. Un modelo de caja negra sobre menores es
indefendible ante el jurado y probablemente ante la Ley 31814.

**Validación por QR.** El QR de ventanilla es estático (sticker impreso, costo ~cero). La
seguridad no está en el QR sino en el servidor: se valida que *ese paciente* tenga *un paso
pendiente* para *esa ubicación* dentro de *una ventana temporal*. Escanear el QR de farmacia
sin tener nada pendiente ahí no hace nada.

**Cuidador sin smartphone.** La ruta funciona igual: el personal de ventanilla escanea el
código del paciente (tarjeta impresa). La app es un acelerador, no un requisito. Esto es
obligatorio dado el perfil socioeconómico de la población SIS.

**Un teléfono, varios hijos.** Un cuidador puede tener múltiples pacientes asociados. Muchos
hogares comparten un solo celular — el modelo de datos lo asume desde el inicio.

---

## 8. Seguridad y cumplimiento

- **Datos 100% sintéticos.** Las bases lo exigen y elimina el riesgo legal completo
- Cifrado en tránsito (TLS) y en reposo (cifrado a nivel de columna para campos sensibles)
- Control de acceso por rol, con principio de mínimo privilegio
- **Bitácora de accesos**: quién vio qué historia y cuándo
- Minimización: la app del cuidador nunca recibe el diagnóstico completo salvo que se requiera
- Sesiones cortas + reautenticación para acciones clínicas

⚠️ **Alerta de las bases, punto 11.4:** está *estrictamente prohibido* usar el nombre, logo o
imagen institucional del INSN San Borja sin autorización expresa por escrito, **incluso después
del evento**. La plataforma debe tener **identidad visual propia**. Nada de poner el logo del
INSNSB en la interfaz o en el repositorio.

---

## 9. Lo que necesito de ti para el diseño

Dijiste que pasarás fuentes. Con eso, necesito definir:

**1. Fuentes**
- Archivos `.woff2` o el nombre exacto
- **Licencia.** Crítico: el repositorio va a ser público con licencia abierta. Una fuente
  comercial no se puede redistribuir en el repo. Si es de pago, la referenciamos pero no la
  commiteamos, o buscamos equivalente abierta. Dime cuál es y lo resolvemos
- Si es una sola familia, necesito que tenga buen rango de pesos — el dashboard clínico y la
  app del cuidador van a usar registros tipográficos muy distintos

**2. Dirección visual**
La plataforma tiene **dos públicos opuestos** y eso debe verse:

| | Dashboard clínico | App del cuidador |
|---|---|---|
| Densidad | Alta, mucha info por pantalla | Una cosa a la vez |
| Tono | Sobrio, instrumental, casi industrial | Cálido, claro, tranquilizador |
| Tamaño | Compacto | Botones enormes, alto contraste |
| Color | Funcional (estados) | Emocional (progreso, calma) |

Es el mismo sistema con dos registros, no dos productos. Dime si estás de acuerdo o prefieres
unificar.

**3. Referencias**
Pásame 2-3 capturas de interfaces que te gusten (de cualquier rubro). Me sirve más eso que una
descripción.

**4. Lo que quiero evitar explícitamente**
Dashboard genérico de tarjetas, gradientes morados, ilustraciones corporativas tipo *undraw*,
menú hamburguesa en la app del cuidador, y el look "plantilla de shadcn". Si el jurado ha visto
esa interfaz 40 veces ese día, perdemos el 15% de pitch antes de hablar.

**5. Nombre**
De tu lluvia de ideas: HemaTrack / HemaFlow / HemaCheck / Pasaporte Hematológico.
Mi preferencia: algo que hable de **continuidad y ruta**, no de sangre. El paciente no quiere
que le recuerden la enfermedad; quiere saber que va llegando. Decide tú, o lo trabajamos.

---

## 10. Lo que NO vamos a construir

Declararlo ahora evita perder tiempo después:

- Servidor FHIR completo → solo endpoint de lectura con forma FHIR
- Integración real con el HIS del INSNSB → mock documentado + contrato de integración
- Envío real de SMS/WhatsApp en la demo → driver simulado, driver real como opción
- App nativa iOS/Android → PWA
- Machine learning → reglas explicables
- Videoconsulta, receta electrónica firmada, facturación → fuera de alcance

Cada uno se menciona en el pitch como **"próximos pasos"**, que es un campo obligatorio del
Anexo 1. Convertir el recorte en roadmap suma puntos en vez de restarlos.

---

## Decisiones pendientes de tu confirmación

1. ¿Apruebas el stack de la sección 3?
2. ¿EC2 + Docker Compose para el demo, o prefieres ECS + RDS desde el inicio?
3. ¿Dos registros visuales (clínico / cuidador) o unificado?
4. Nombre de la plataforma
5. Fuentes y su licencia
6. Cuántos días reales tienes — no cambia la arquitectura, cambia cuántas de las 12 pantallas
   entran
