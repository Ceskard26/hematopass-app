# Motor de riesgo

Reglas explícitas, no machine learning. Sin datos de entrenamiento (no
existen y sería ilegal usarlos sobre menores), y una caja negra sobre
pacientes pediátricos es indefendible ante un jurado clínico y
probablemente ante la Ley 31814 (promoción del uso de IA en Perú).

**Cada alerta muestra su motivo en español, redactado en lenguaje natural.**
"Mateo lleva 31 días sin venir", no "Alerta R1 activada".

Implementación: [`src/lib/risk-engine.ts`](../src/lib/risk-engine.ts) (F5).

## Las 5 reglas

| Regla | Condición | Severidad | Motivo mostrado |
|---|---|---|---|
| **R1 · Abandono** | Ruta activa sin pasos completados en ≥ `RISK_R1_DIAS_SIN_ACTIVIDAD` días | Crítica | "31 días sin actividad. Cumple la definición internacional de abandono (SIOP-PODC)." |
| **R2 · Paso vencido** | Paso `programado`/`notificado` con `vence_en` superado hace más de `RISK_R2_HORAS_VENCIDO` horas | Alta | "Paso 'Recoger medicina' vencido hace 3 días." |
| **R3 · Inasistencias** | 2 pasos consecutivos en `no_asistio` | Alta | "2 citas consecutivas sin asistir." |
| **R4 · Resultado huérfano** | `resultado_lab` en estado `listo` hace más de `RISK_R4_HORAS_RESULTADO_HUERFANO` horas sin consulta de control programada | Media | "Hemograma listo hace 4 días, sin cita de control agendada." |
| **R5 · Viaje en riesgo** ⭐ | `paciente.es_provincia = true` **Y** consulta programada en menos de `RISK_R5_HORAS_VIAJE` horas **Y** resultado de laboratorio pendiente | Alta | "Familia de Junín viaja en 36h, pero el hemograma aún no está listo. Confirmar o reprogramar antes del viaje." |

## Por qué R5 es la regla que importa

Las otras cuatro son reactivas: detectan que algo ya salió mal. **R5 es la
única preventiva** — actúa antes de que ocurra el daño.

Sale directo de la investigación del proyecto: 54% de los pacientes
hospitalizados del INSN San Borja provienen de fuera de Lima, y ~41% del
abandono de tratamiento en la región tiene causa económica o de
transporte. R5 no persigue al paciente que ya abandonó — previene el viaje
interprovincial desperdiciado que es, con más frecuencia que cualquier
otra causa, lo que produce el abandono.

## Umbrales configurables, no incrustados en código

Todos los umbrales viven en variables de entorno (`.env.example`), nunca
como números fijos en la lógica. Cuando el mentor clínico del INSNSB
corrija un valor con el dato real del servicio de hematología, se cambia
en configuración — no se toca código ni se redespliega lógica nueva.

```bash
RISK_R1_DIAS_SIN_ACTIVIDAD="28"    # definición SIOP-PODC: 4 semanas
RISK_R2_HORAS_VENCIDO="48"
RISK_R4_HORAS_RESULTADO_HUERFANO="72"
RISK_R5_HORAS_VIAJE="48"
```

## Lo que el motor NO hace

No predice. No asigna una probabilidad. No aprende de datos históricos de
pacientes. Evalúa condiciones explícitas contra el estado actual de la
bitácora de eventos y produce una alerta con una razón legible. Esa
limitación es deliberada.
