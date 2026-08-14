# Hematopass — Plan de desarrollo y diseño

Estado: plan aprobado para ejecución. Liderazgo técnico y de diseño: Claude.
Alcance de este documento: **solo construcción y diseño.**

---

## 0. Principio rector

**Se construye hacia atrás desde la demo.** En una hackatón nadie lee el código; el jurado ve
tres minutos de producto funcionando. Todo lo que no aparece en esos tres minutos, o no
sostiene una respuesta a una pregunta del jurado, no se construye.

Segundo principio: **el orden de construcción es el orden de riesgo.** Lo que puede fallar y
matar la demo se construye primero, no al final.

### La demo, definida antes que el código

Dos dispositivos lado a lado. Laptop = médico. Celular = cuidador.

| Beat | Qué pasa | Qué demuestra |
|---|---|---|
| **1** | El médico selecciona "Siguiente paso → Farmacia, ventanilla 2" | Cero carga administrativa: 2 clics |
| **2** | El celular se ilumina **al instante**, sin recargar | Tiempo real. Es el momento "ah" |
| **3** | Escaneo de un **sticker QR real pegado en la mesa del pitch** | Validación física sin hardware nuevo |
| **4** | Se estampa el sello en el pasaporte + el médico ve "completado" | Cierre del ciclo, trazabilidad bidireccional |
| **5** | Bandeja de riesgo: paciente de Junín, consulta en 36h, hemograma pendiente | **Prevención del viaje desperdiciado** |
| **6** | Paciente con 31 días sin actividad, marcado por la regla SIOP-PODC | Detección de abandono con definición internacional |

El sticker QR impreso en la mesa es deliberado: convierte una demo de software en algo físico
que el jurado puede tocar. Cuesta una impresión.

---

## 1. Alcance congelado

12 pantallas, priorizadas con líneas de corte explícitas. **Si el tiempo aprieta se recorta por
abajo, nunca por la mitad.**

| # | Pantalla | Prio | Beat |
|---|---|---|---|
| 1 | Lista de pacientes (clínico) | **P0** | 1 |
| 2 | Ficha de paciente + línea de ruta | **P0** | 1, 4 |
| 3 | Generar siguiente paso | **P0** | 1 |
| 4 | Tarjeta AHORA (cuidador) | **P0** | 2 |
| 5 | Escáner QR | **P0** | 3 |
| 6 | Mi pasaporte (sellos) | **P0** | 4 |
| 7 | Bandeja de riesgo | **P1** | 5, 6 |
| 8 | ¿Debo viajar? | **P1** | 5 |
| 9 | Panel de impacto | **P1** | — (respuesta a preguntas) |
| 10 | Registro de recontacto | **P2** | — |
| 11 | Resultados pendientes (clínico) | **P2** | — |
| 12 | Señales de alarma | **P2** | — |

- **P0** = la demo no existe sin esto
- **P1** = sin esto la demo funciona pero pierde el diferenciador
- **P2** = suma profundidad si sobra tiempo

---

## 2. Fases de construcción

Estimaciones para un desarrollador solo con asistencia de IA. Mapéalas a los días que tengas.

### F0 · Fundaciones — ~4h
- Monorepo Next.js 16 + TypeScript, `output: 'standalone'`
- `docker-compose.yml`: app + postgres + caddy
- Tailwind v4 con los tokens de Hematopass declarados
- Fuentes locales (Roboto Serif, Lato) + sus archivos de licencia
- Auth.js con 4 roles: `medico`, `gestor`, `ventanilla`, `admin`
- README, LICENCIA (MIT), NOTICE con atribución a Odyssey

**Criterio de salida:** `docker compose up` levanta la app con login funcionando.

### F1 · Dominio — ~6h
Esquema completo + migraciones Drizzle + datos sintéticos.

**Criterio de salida:** la base tiene 24 pacientes sintéticos con rutas en distintos estados y
las 4 alertas de la demo ya se pueden calcular.

### F2 · Dashboard clínico — ~8h
Pantallas 1, 2, 3. Es el origen de todos los eventos: sin esto no hay nada que mostrar.

**Criterio de salida:** el médico puede generar un paso y verlo en la línea de ruta.

### F3 · App del cuidador + QR — ~8h
Pantallas 4, 5, 6. Ruta separada con `data-surface="caregiver"`.
Lectura de QR con `html5-qrcode`, validación en servidor.

**Criterio de salida:** escanear un QR impreso completa un paso real.

### F4 · Tiempo real — ~3h
SSE + Postgres `LISTEN/NOTIFY`. Es el beat 2, el momento que vende la demo.
Se construye temprano porque es donde puede haber sorpresas de infraestructura.

**Criterio de salida:** el celular se actualiza en <1s sin recargar.

> **⛔ LÍNEA DE CORTE 1 — ~34h con F9.**
> Hasta aquí hay una demo completa y defendible del ciclo médico → cuidador → validación → cierre.
> Si solo llegas a esto, tienes un proyecto sólido.

### F5 · Motor de riesgo + bandeja — ~6h
Pantallas 7, 8. **Este es el diferenciador**: sin esto Hematopass es una app de rutas más.

**Criterio de salida:** las 4 alertas de la demo aparecen con su motivo explícito en texto.

### F6 · Panel de impacto — ~4h
Pantalla 9. Métricas sobre la bitácora de eventos. Es la munición para las preguntas del jurado
sobre impacto medible.

### F7 · PWA + offline — ~4h
Service worker, manifest, cola de escaneos en IndexedDB.
Permite afirmar "funciona sin señal" y **demostrarlo poniendo el celular en modo avión**.

### F8 · Diseño y pulido — ~10h
El sello y sus animaciones, wayfinding, tránsitos, estados vacíos, accesibilidad, revisión de
contraste AA. **No es opcional**: es el 15% de pitch y buena parte del 20% de usuario.

> **⛔ LÍNEA DE CORTE 2 — ~52h.** Demo competitiva completa.

### F9 · Despliegue — ~5h
EC2 + Docker Compose + Caddy + dominio. Repo público con documentación de reutilización.
**Se hace un despliegue de prueba al terminar F4**, no al final. Un deploy que falla la noche
antes es la causa de muerte más común en hackatones.

### F10 · P2 si sobra — pantallas 10, 11, 12

**Total núcleo ≈ 58h.**

---

## 3. Modelo de datos

Nomenclatura alineada a FHIR. **Todos los datos son sintéticos.**

| Tabla | Campos principales |
|---|---|
| `usuario` | id, email, nombre, rol, activo |
| `paciente` | id, codigo, nombre, fecha_nac, sexo, dx_cie10, dx_nombre, departamento, **es_provincia**, fase_tratamiento, ruta_activa_id |
| `cuidador` | id, nombre, telefono, relacion |
| `paciente_cuidador` | paciente_id, cuidador_id, es_principal |
| `ubicacion` | id, nombre, tipo, piso, modulo, ventanilla, **qr_token** |
| `ruta` | id, paciente_id, protocolo, fase, estado, creada_por, creada_en |
| `paso` | id, ruta_id, orden, tipo, ubicacion_id, titulo_clinico, **instruccion_cuidador**, estado, programado_para, vence_en, completado_en |
| `evento` | id, entidad_tipo, entidad_id, tipo, actor_id, actor_rol, payload, ocurrido_en, origen · **append-only** |
| `alerta` | id, paciente_id, regla, severidad, **motivo_texto**, estado, creada_en, resuelta_en |
| `contacto` | id, alerta_id, usuario_id, canal, resultado, nota, ocurrido_en |
| `resultado_lab` | id, paciente_id, tipo, solicitado_en, listo_en, estado |

**Dos decisiones que importan:**

`paso` tiene **dos títulos**. `titulo_clinico` = "Dispensación de inmunosupresores".
`instruccion_cuidador` = "Recoge la medicina en Farmacia, ventanilla 2". El mismo hecho, dos
idiomas. Esto es el producto entero en un par de columnas.

`evento` es **append-only y es la fuente de verdad**. El estado actual se deriva de la bitácora,
no al revés. Da auditoría médico-legal, permite reconstruir cualquier ruta, y es lo que alimenta
las métricas de impacto sin instrumentación adicional.

### Máquina de estados de `paso`

```
programado ──> notificado ──> en_curso ──> completado
     │              │              │
     └──────────────┴──────────────┴──> vencido ──> reprogramado
                                    └──> no_asistio
```

Tipos de paso: `consulta`, `laboratorio`, `imagen`, `farmacia`, `transfusion`, `tramite_sis`,
`referencia`, `control`.

Cada transición escribe un `evento`. Sin excepciones.

---

## 4. Motor de riesgo

Reglas explícitas, evaluadas periódicamente. **Cada alerta muestra su motivo en español.**
Nada de ML: no tenemos datos de entrenamiento, sería ilegal usarlos, y una caja negra sobre
menores es indefendible ante el jurado.

| Regla | Condición | Severidad | Motivo mostrado |
|---|---|---|---|
| **R1 · Abandono** | Ruta activa, sin pasos completados en **≥28 días** | Crítica | "31 días sin actividad. Cumple la definición internacional de abandono (SIOP-PODC)." |
| **R2 · Paso vencido** | Paso `programado`/`notificado` con `vence_en` superado hace >48h | Alta | "Paso 'Recoger medicina' vencido hace 3 días." |
| **R3 · Inasistencias** | 2 pasos consecutivos en `no_asistio` | Alta | "2 citas consecutivas sin asistir." |
| **R4 · Resultado huérfano** | `resultado_lab` listo hace >72h sin consulta posterior programada | Media | "Hemograma listo hace 4 días, sin cita de control agendada." |
| **R5 · Viaje en riesgo** ⭐ | `es_provincia` = true **AND** consulta en <48h **AND** resultado pendiente | Alta | "Familia de Junín viaja en 36h, pero el hemograma aún no está listo. Confirmar o reprogramar antes del viaje." |

**R5 es la regla que justifica el proyecto entero.** Es la única *preventiva*: actúa antes de
que ocurra el daño. Sale directo de los datos del Bloque 1 — 54% de pacientes hospitalizados
viene de provincia, y ~41% del abandono tiene causa económica/transporte. No previene el
abandono castigando al que ya se fue; previene el viaje desperdiciado que lo causa.

Todas las reglas son **parámetros configurables**, no números incrustados en el código: cuando
el mentor clínico corrija los umbrales, se cambian sin tocar la lógica.

---

## 5. Datos sintéticos: la demo es una historia

24 pacientes. **Cuatro son personajes con guion; los otros 20 dan textura de sala real.**

| Caso | Perfil | Dispara | Rol en la demo |
|---|---|---|---|
| **A** | Lima, LLA en mantenimiento, ruta al día | — | El ciclo feliz. Beats 1-4 |
| **B** | **Junín**, consulta en 36h, hemograma pendiente | **R5** | El corazón del pitch |
| **C** | Áncash, 31 días sin actividad | **R1** | Abandono detectado |
| **D** | Lima, 2 inasistencias | **R3** | Riesgo acumulado |

Los 20 de fondo se generan con distribución realista: mezcla de diagnósticos hematológicos
(LLA, LMA, anemia aplásica, drepanocitosis, talasemia, hemofilia, PTI), procedencia con **~54%
fuera de Lima** — la cifra real del INSNSB — y rutas en distintos estados.

**Ningún nombre real, ningún dato real.** Nombres peruanos verosímiles generados. Esto cumple
las bases y se declara explícitamente en la interfaz con una marca de "datos sintéticos".

Las ubicaciones sí son verosímiles: Admisión, Caja SIS, Triaje, Consultorio de Hematología,
Laboratorio, Banco de Sangre, Farmacia, Imágenes, Referencias — cada una con su QR.

---

## 6. Plan de diseño

### 6.1 El sello — componente insignia

El único elemento donde vale la pena gastar horas de diseño.

**Anatomía:** forma hexagonal (distingue de cualquier check circular genérico), anillo exterior
con el nombre de la ubicación y la fecha, pictograma al centro según tipo de paso, rotación
leve y aleatoria por sello (entre −8° y +8°), textura de tinta con bordes imperfectos.

**Animación de estampado:** ~400ms. Bajada con escala 1.4→1, impacto, expansión de tinta, leve
rebote. Respeta `prefers-reduced-motion` con un fundido simple.

**Estados:** vacío (contorno punteado, esperando), sellado, en cola (escaneado sin conexión,
pendiente de sincronizar — visualmente distinto, en gris).

### 6.2 Los tres temas, traducidos a decisiones

**HOSPITAL → la app del cuidador habla el idioma de la señalética, no del software.**

Esta es la decisión creativa central. La familia ya está leyendo carteles en las paredes:
flechas, números de piso, letras de módulo, pictogramas. La app **usa ese mismo vocabulario**
en vez del lenguaje de una app SaaS.

- Flechas direccionales grandes, no íconos decorativos
- "PISO 1 · MÓDULO B · VENTANILLA 2" en tipografía de señalética, alto contraste
- Pictogramas de sistema de wayfinding, no ilustraciones
- Sin menú hamburguesa, sin tabs sutiles, sin tarjetas flotantes

Es distintivo **y** funcionalmente correcto: reduce la carga cognitiva porque coincide con lo
que la persona ve en la pared.

**PERSONAS → la interfaz nombra gente, no registros.**

- "Mateo, 7 años" — nunca "Paciente #4821"
- La bandeja de riesgo dice "Mateo lleva 31 días sin venir", no "Alerta R1 activada"
- El motivo de cada alerta se redacta como se lo dirías a un colega
- Marcas de identidad por iniciales con color estable, sin fotos ni avatares de stock

**SALUD → progreso, no alarma.**

- El estado dominante es el avance, no la advertencia
- El rojo se reserva para lo que de verdad es urgente; un paso vencido es terracota, no rojo
- La app del cuidador nunca muestra pronóstico, mortalidad ni el diagnóstico completo
- El lenguaje es de camino recorrido: "Vas por el paso 12 de 18 de esta fase"

### 6.3 Las dos superficies

| | Clínico | Cuidador |
|---|---|---|
| Paleta | `ocean` — azul institucional | `earth` — salvia y beige |
| Base tipográfica | 14px, densa | 19px, amplia |
| Ancho | 1440px | 640px |
| Unidad | La tabla | La tarjeta única |
| Navegación | Barra lateral persistente | 3 destinos fijos abajo |
| Densidad | Muchos pacientes por pantalla | Una cosa a la vez |

Unidas por: mismos tokens, misma tipografía, el naranja `sand` del sello, y los mismos íconos
de estado.

### 6.4 La tarjeta AHORA

La pantalla más importante del producto. Se diseña primero y se pule al final.

Ocupa toda la pantalla. Sin menú visible. De arriba abajo: tipo de paso en pequeño, **el destino
en tipografía enorme**, la ubicación en formato señalética, la instrucción en lenguaje llano,
y un solo botón — escanear.

Debe ser entendible **sin leer**, de un vistazo, en un pasillo, sosteniendo a un niño.

### 6.5 Reglas duras

1. Objetivo táctil ≥48×48px en la app del cuidador
2. Contraste WCAG AA mínimo; AAA en la tarjeta AHORA
3. El color nunca comunica solo: siempre forma + ícono + texto
4. Cero llamadas de red para renderizar: fuentes locales, íconos inline
5. Sin logo, nombre ni imagen del INSN San Borja en ninguna parte (bases, 11.4)
6. Todo en español, sin tecnicismos en la cara del cuidador
7. Modo oscuro solo si sobra tiempo

---

## 7. Repositorio y entregables abiertos

Las bases exigen componentes públicos, reutilizables y con licencia abierta.

```
hematopass/
├── README.md              qué es, cómo levantarlo en 3 comandos
├── LICENSE                MIT
├── NOTICE                 Odyssey (MIT), Lato (OFL), Roboto Serif (Apache 2.0)
├── docs/
│   ├── arquitectura.md
│   ├── sistema-de-diseno.md
│   ├── modelo-de-datos.md
│   ├── motor-de-riesgo.md     reglas y umbrales, para que un hospital los ajuste
│   └── despliegue.md          AWS y on-premise
├── docker-compose.yml
└── src/
```

**El README decide si el repo cuenta como "reutilizable".** Tiene que permitir que alguien
ajeno levante Hematopass en tres comandos. Se escribe en F0 y se mantiene, no se improvisa al
final.

---

## 8. Riesgos de construcción

| Riesgo | Prob. | Mitigación |
|---|---|---|
| El deploy falla la noche antes | Alta | Desplegar al terminar F4, no al final |
| La cámara QR falla en el celular del jurado | Media | HTTPS obligatorio (Caddy) + modo manual con código de 6 dígitos como respaldo |
| SSE se corta detrás de un proxy | Media | Polling de respaldo cada 5s si el stream muere |
| El wifi del venue falla | **Alta** | PWA offline (F7) + hotspot propio + video de respaldo grabado |
| Alcance se dispara | Alta | Líneas de corte ya definidas. Se recorta por abajo |
| Perfeccionismo visual devora el tiempo | Media | El sello y la tarjeta AHORA son los únicos elementos con presupuesto de pulido |

**El video de respaldo grabado no es pesimismo, es procedimiento.** Se graba al cerrar F8.

**Pendiente de verificación manual (F7):** el registro del Service Worker
(`public/sw.js`) no pudo probarse dentro del navegador en sandbox usado
durante el desarrollo — un service worker mínimo de una línea falla ahí
con el mismo error genérico ("An unknown error occurred when fetching the
script"), lo que apunta a una limitación de ese entorno de pruebas
específico, no a un defecto de código (se descartó gzip/chunked sin
Content-Length como causa real y se corrigió igual, por buenas prácticas).
La cola de escaneos en IndexedDB sí se verificó funcionando de forma
aislada. **Antes de la demo:** abrir DevTools → Application → Service
Workers en un navegador real y confirmar que `sw.js` registra en
`/cuidador/`, y probar el flujo completo en modo avión.

---

## 9. Orden de ejecución

```
F0 → F1 → F2 → F3 → F4 → [deploy de prueba] → F5 → F8(parcial) → F6 → F7 → F8(final) → F9
```

El diseño no es una fase al final: los tokens entran en F0, el sello y la tarjeta AHORA se
diseñan mientras se construye F3, y F8 es pulido, no creación desde cero.

---

## Listo para empezar

Con tu visto bueno arranco por **F0 · Fundaciones**. Lo único que sigue sin definir es cuántos
días tienes — y ya no bloquea: las líneas de corte están puestas, así que el plan se adapta solo
recortando por abajo. Si me dices el número, te digo exactamente dónde vas a terminar.
