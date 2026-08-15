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
| `paciente` | Paciente pediátrico. **Siempre sintético** (`es_sintetico = true`). Incluye `medico_tratante_id` (médico actualmente asignado, distinto de `ruta.creada_por` que es histórico por ruta) y `derivado_servicio_social_en` (presencia = derivado) | `Patient` |
| `cuidador` | Padre/madre/tutor. Acceso propio, sin cuenta de staff. `dni` es el segundo factor de su ingreso (junto al código del paciente); `canal_preferido` es solo una preferencia persistida, sin envío real de SMS/WhatsApp integrado | `RelatedPerson` |
| `paciente_cuidador` | Relación N:N — un cuidador puede tener varios pacientes (hermanos) | — |
| `ubicacion` | Ventanilla física con su `qr_token` estático | `Location` |
| `ruta` | Plan de atención activo de un paciente. `ultima_decision` registra la última decisión clínica (continuar/ajustar/derivar) — desacoplada del motor de riesgo, no dispara alertas | `CarePlan` |
| `paso` | Unidad atómica de la ruta. Tiene **dos títulos** (ver abajo), más `nota_medica` (nota libre del médico, visible para el cuidador), `confirmacion_asistencia` y `termometro_emocional` (ambos registrados por el cuidador) | `Task` |
| `evento` | Bitácora inmutable de todo lo que ocurre | `Provenance` |
| `alerta` | Salida del motor de riesgo (F5) | `Flag` |
| `contacto` | Intento de recontacto y su resultado | `Communication` |
| `resultado_lab` | Estado de resultados de laboratorio — nunca el valor clínico, solo tipo/estado/fechas | `Observation` (simplificado) |
| `mensaje` | Chat de dos vías entre cuidador y equipo tratante, por paciente | `Communication` |

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

`alerta.regla` referencia una de las 5 reglas del motor de riesgo (F5):
`R1_abandono`, `R2_paso_vencido`, `R3_inasistencias`, `R4_resultado_huerfano`,
`R5_viaje_en_riesgo`. `alerta.severidad` es `media` | `alta` | `critica`
(mapea al semáforo verde/amarillo/rojo del dashboard: sin alerta activa =
verde, `media` = amarillo, `alta`/`critica` = rojo). `alerta.estado` es
`activa` | `en_seguimiento` | `resuelta` | `descartada`. `motivo_texto` es
siempre lenguaje natural, redactado como se lo dirías a un colega — nunca
un código interno.

## Tipos de evento (`evento.tipo`)

Todo lo que cambia estado en el sistema escribe uno de estos, sin
excepciones — nunca se reutiliza un tipo existente para algo que no es
exactamente eso, aunque parezca cercano.

`paso_creado` · `paso_notificado` · `paso_iniciado` · `paso_completado` ·
`paso_vencido` · `paso_reprogramado` · `paso_no_asistio` ·
`paso_nota_actualizada` · `paso_confirmado` · `termometro_registrado` ·
`qr_escaneado` · `alerta_creada` · `alerta_resuelta` · `alerta_descartada` ·
`contacto_registrado` · `resultado_solicitado` · `resultado_listo` ·
`mensaje_enviado` · `decision_clinica_registrada` ·
`derivacion_servicio_social` · `preferencia_canal_actualizada`

## Chat cuidador↔equipo tratante (`mensaje`)

Dos vías, con historial persistente e inserción en tiempo real (reutiliza
`notificarPaciente()`/SSE, sin transporte nuevo). `autor_tipo` es
`cuidador` | `medico`; según cuál sea, se pobla `autor_cuidador_id` o
`autor_usuario_id` (el otro queda `null`). `leido_en` nullable, marca
lectura.
