# Modelo de datos

Fuente de verdad: [`src/db/schema.ts`](../src/db/schema.ts). Este documento es
una referencia legible; ante cualquier discrepancia, el código manda.

Nomenclatura alineada a HL7 FHIR sin montar un servidor FHIR completo — ver
[`arquitectura.md`](arquitectura.md) §5.

## Regla dura: `evento` es la fuente de verdad

`evento` es **append-only**. Toda transición de estado en `paso`, `alerta`
o `paciente` debe insertar una fila en `evento`, sin excepciones. El campo
`estado` en las demás tablas existe por performance de lectura, pero se
deriva de la bitácora — no al revés.

Esto da tres cosas gratis: auditoría médico-legal, capacidad de
reconstruir cualquier ruta completa, y las métricas del panel de impacto
(F6) sin instrumentación adicional.

## Tablas

| Tabla | Qué representa | Equivalente FHIR |
|---|---|---|
| `usuario` | Personal del hospital (4 roles: `medico`, `gestor`, `ventanilla`, `admin`) | `Practitioner` |
| `paciente` | Paciente pediátrico. **Siempre sintético** (`es_sintetico = true`) | `Patient` |
| `cuidador` | Padre/madre/tutor. Acceso propio, sin cuenta de staff | `RelatedPerson` |
| `paciente_cuidador` | Relación N:N — un cuidador puede tener varios pacientes (hermanos) | — |
| `ubicacion` | Ventanilla física con su `qr_token` estático | `Location` |
| `ruta` | Plan de atención activo de un paciente | `CarePlan` |
| `paso` | Unidad atómica de la ruta. Tiene **dos títulos** (ver abajo) | `Task` |
| `evento` | Bitácora inmutable de todo lo que ocurre | `Provenance` |
| `alerta` | Salida del motor de riesgo (F5) | `Flag` |
| `contacto` | Intento de recontacto y su resultado | `Communication` |
| `resultado_lab` | Estado de resultados de laboratorio | `Observation` (simplificado) |

## La decisión que es el producto: dos títulos por paso

```ts
tituloClinico: "Dispensación de inmunosupresores"
instruccionCuidador: "Recoge la medicina en Farmacia, ventanilla 2"
```

Mismo hecho, dos idiomas. El médico ve el primero; la familia, el segundo.
Esta traducción — que hoy no existe en el proceso real — es el núcleo de
lo que Hematopass aporta.

## Máquina de estados de `paso`

```
programado ──> notificado ──> en_curso ──> completado
     │              │              │
     └──────────────┴──────────────┴──> vencido ──> reprogramado
                                    └──> no_asistio
```

Cada transición escribe un `evento` con `tipo` correspondiente
(`paso_notificado`, `paso_completado`, etc.), `actor_id`, `actor_rol`, y
`origen` (`web` | `qr` | `sistema`).

## Tipos de paso

`consulta` · `laboratorio` · `imagen` · `farmacia` · `transfusion` ·
`tramite_sis` · `referencia` · `control`

## Alertas — ver `docs/motor-de-riesgo.md`

`alerta.regla` referencia una de las 5 reglas del motor de riesgo (F5).
`motivo_texto` es siempre lenguaje natural, redactado como se lo dirías a
un colega — nunca un código interno.
