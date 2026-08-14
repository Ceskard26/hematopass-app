# Hematopass — Sistema de diseño

Base: **Odyssey Theme** (Tree Farm Studio) · Licencia **MIT** · `Copyright (c) 2024 Treefarm Studio LLC`
Estado: propuesta. **No se ha escrito código.**

---

## 1. Qué tomamos y qué no

Odyssey está construido en **Astro**; nosotros vamos en **Next.js**. No se forkea el tema:
se **porta su arquitectura de tokens**, que es lo valioso.

| Tomamos | No tomamos |
|---|---|
| Sistema de variables CSS (`--theme-*`) | Los componentes `.astro` |
| Par tipográfico Roboto Serif + Lato | Las secciones de landing/marketing |
| Escala fluida con `clamp()` | La escala en sus valores actuales (demasiado grande) |
| Idea de paletas nombradas e intercambiables | El theme-switcher del usuario final |
| Fuentes locales (sin CDN externo) | Blog, formularios de contacto |

**Atribución obligatoria** en el repo (`NOTICE` o `README`): el punto 11.1 de las bases exige
identificar componentes de terceros y respetar sus licencias. MIT solo pide conservar el aviso
de copyright. Trámite de dos líneas, pero no se puede olvidar.

---

## 2. Licencias — resueltas

Este era mi único bloqueo de diseño y quedó limpio:

| Recurso | Licencia | ¿Se puede commitear al repo público? |
|---|---|---|
| Odyssey Theme | MIT | ✅ con aviso de copyright |
| **Lato** | SIL Open Font License 1.1 | ✅ redistribuible |
| **Roboto Serif** | Apache License 2.0 | ✅ redistribuible |

Las tres son compatibles con publicar Hematopass bajo licencia abierta. **Verificar los archivos
de licencia de las fuentes al descargarlas** y copiarlos junto a los `.woff2`.

Además: las fuentes van **autoalojadas**, sin Google Fonts. Eso no es solo performance — evita
una llamada a un tercero desde una app de salud, lo cual importa para el argumento de privacidad.

---

## 3. La idea de marca: el pasaporte

El nombre **Hematopass** resuelve el problema que te había planteado: no habla de sangre ni de
enfermedad, habla de **tránsito y de documento de viaje**. Y trae una metáfora que ordena todo
el producto:

> **Cada escaneo de QR en una ventanilla es un sello en el pasaporte.**

Por qué esto es fuerte y no decorativo:

- Para el **niño**: coleccionar sellos. Gamificación que nace del mecanismo real, no pegada encima
- Para el **cuidador**: un registro oficial de que sí cumplió, que sí estuvo ahí
- Para el **clínico**: cada sello es un evento verificado con hora, lugar y actor — la bitácora de auditoría
- Para el **jurado**: un objeto único explica el producto entero en una frase

Es el mismo objeto leído en tres registros. Eso es exactamente la tesis de "un sistema, dos caras".

**Consecuencia de diseño:** el sello es el elemento gráfico central. No un ícono de check genérico
— un sello con forma, fecha, ubicación y textura de estampado. Ahí es donde invertimos el
esfuerzo visual distintivo.

**Lo que evitamos:** cruz roja, gota de sangre, corazón latiendo, estetoscopio, ADN. Todo el
vocabulario visual médico de stock.

---

## 4. Tipografía

Par heredado de Odyssey, y es la decisión que más nos aleja de lo genérico:

| Rol | Fuente | Pesos | Por qué |
|---|---|---|---|
| Títulos | **Roboto Serif** | 600, 700 | La serif da peso institucional y documental. Es la voz del "pasaporte" |
| Interfaz y cuerpo | **Lato** | 300, 400, 700 | Humanista, altamente legible en tamaños pequeños y en pantallas de gama baja |

La combinación serif-titular + sans-interfaz es lo que hace que **no se vea como una plantilla**.
La mayoría de proyectos de hackatón usan una sola sans geométrica en todo.

### Escala: una definición, dos cortes

La escala de Odyssey llega a 84px — es escala de landing page. La conservamos como sistema pero
**cada superficie usa un tramo distinto**:

| Token | Dashboard clínico | App del cuidador | Uso |
|---|---|---|---|
| `xs` | 12px | — | metadatos, timestamps |
| `sm` | 13px | 16px | etiquetas, secundario |
| `base` | 14px | 19px | cuerpo |
| `md` | 16px | 24px | subtítulos |
| `lg` | 20px | 32px | títulos de sección |
| `xl` | 26px | 44px | título de pantalla |
| `xxl` | — | 60px | **el paso actual** en la app |

El dashboard clínico va **denso** (14px base): el médico necesita ver muchos pacientes sin
scroll. La app del cuidador va **grande** (19px base): se usa de pie, en un pasillo, con un niño
en brazos, en un celular de gama baja, posiblemente por alguien con presbicia.

Es el mismo `clamp()` fluido de Odyssey, con dos rangos.

---

## 5. Color: dos paletas, un sistema

Odyssey ya trae paletas nombradas (`default`, `dark`, `earth`, `ocean`, `sand`). Las usamos como
punto de partida para los **dos registros** que te propuse — y así la unificación es real, no
una excusa.

### Registro clínico — derivado de `ocean`

Sobrio, institucional, instrumental.

| Token | Valor base | Uso |
|---|---|---|
| `--primary` | `#1556ac` | acciones, foco, énfasis |
| `--bg` | `#fafafa` | fondo de aplicación |
| `--surface-1` | blanco | tarjetas, filas |
| `--surface-2` | gris muy claro | encabezados de tabla, zonas inertes |
| `--text` | casi negro | texto principal |

### Registro cuidador — derivado de `earth`

Cálido, tranquilizador, no clínico. Un hospital ya se siente bastante hospital.

| Token | Valor base | Uso |
|---|---|---|
| `--primary` | `#2c3e2d` (verde salvia oscuro) | acción principal, avance |
| `--bg` | `#eeeff1` (beige claro) | fondo |
| `--surface-1` | crema | tarjeta del paso actual |
| `--accent` | `#e38a20` (de `sand`) | sello, celebración, hito |

**El naranja de `sand` es el color del sello.** Aparece en las dos superficies: en la app como
celebración, en el dashboard como marca de evento verificado. Es el hilo visual que une ambas
caras.

### Colores funcionales de estado

Estos son iguales en ambas superficies — son semántica, no estilo:

| Estado del paso | Color | Forma | Ícono |
|---|---|---|---|
| `programado` | neutro | círculo vacío | — |
| `notificado` | azul | círculo punteado | campana |
| `en_curso` | ámbar | círculo medio | flecha |
| `completado` | verde | **sello** | check |
| `vencido` | terracota | triángulo | alerta |
| `abandono` (≥4 sem) | terracota intenso | triángulo relleno | alerta doble |

⚠️ **Regla dura de accesibilidad: el color nunca comunica solo.** Cada estado lleva forma + ícono
+ etiqueta de texto. Razones: daltonismo (~8% de hombres), pantallas baratas con color pésimo,
luz de pasillo hospitalario, y una app usada bajo estrés. Además es un punto directo en el
criterio de **Enfoque en el usuario (20%)**.

---

## 6. Arquitectura de tokens

Odyssey define variables CSS en `:root` y las sobreescribe por paleta. Tailwind v4 es
**nativo de variables CSS**, así que el modelo transfiere sin fricción: los tokens se declaran
una vez y Tailwind genera utilidades a partir de ellos.

Mapeo de nombres:

| Odyssey | Hematopass | Nota |
|---|---|---|
| `--theme-primary` | `--color-primary` | |
| `--theme-bg` | `--color-bg` | |
| `--theme-surface-1/2` | `--color-surface-1/2` | |
| `--theme-shape-radius` | `--radius` | Odyssey lo hace fluido con `clamp()`; lo conservamos |
| `--theme-transition` | `--transition` | `0.2s ease-in-out` |
| `--theme-grid-gap` | `--space-*` | ampliamos a escala completa de espaciado |
| `--theme-section-margin` | `--space-section` | `3rem` |
| `--theme-max-width` | `--width-max` | 1440px clínico / 640px cuidador |

El cambio de registro se hace con un atributo en el elemento raíz (`data-surface="clinical"` /
`"caregiver"`), igual que Odyssey cambia de paleta. **Un solo CSS, dos personalidades.**

---

## 7. Inventario de componentes

Lo que hay que diseñar. Marcados los que cargan el peso visual:

**Compartidos**
- Tokens, tipografía, iconografía propia
- ⭐ **Sello** — el componente insignia. Estados: vacío, sellado, animación de estampado
- Estado de paso (badge con forma + ícono + texto)
- ⭐ **Línea de ruta** — la representación temporal del tratamiento. Vertical en móvil, horizontal en escritorio

**Clínico**
- Tabla de pacientes densa, con estado de ruta inline
- Ficha de paciente con línea de tiempo
- Selector de siguiente paso (destino + acción, 2 clics)
- ⭐ **Bandeja de riesgo** — lista priorizada con motivo explícito de cada alerta
- Panel de métricas

**Cuidador**
- ⭐ **Tarjeta AHORA** — pantalla completa, un solo paso, sin menú. Es *la* pantalla del producto
- Escáner QR (estado: buscando / leyendo / éxito / sin conexión)
- Mi ruta (el pasaporte completo, con sus sellos)
- Semáforo "¿debo viajar?"
- Señales de alarma

**Sin menú hamburguesa en la app del cuidador.** Máximo 3 destinos, siempre visibles.

---

## 8. Reglas duras

1. Objetivo táctil mínimo **48×48px** en la app del cuidador
2. Contraste **WCAG AA mínimo**; AAA en la tarjeta AHORA
3. La app del cuidador debe ser **entendible sin leer** — ícono + color + posición
4. **Todo en español**, sin tecnicismos en la cara del cuidador ("Farmacia, ventanilla 2", no "dispensación de inmunosupresores")
5. Cero dependencia de red para renderizar: fuentes locales, íconos inline, sin CDN
6. **Sin logo ni nombre del INSN San Borja** en la interfaz (bases, punto 11.4)
7. Modo oscuro: solo si sobra tiempo. No es prioridad en un hospital iluminado

---

## 9. Pendiente de tu decisión

1. **¿Las capturas de referencia?** Dijiste que pasarías fuentes de diseño; llegó Odyssey, que
   me da el sistema. Aún me sirven 2-3 capturas de interfaces que te gusten para calibrar el
   nivel de detalle visual
2. ¿Apruebas la metáfora del **sello/pasaporte** como eje visual?
3. ¿Los dos registros de color (ocean clínico / earth cuidador), o prefieres una sola paleta?
4. Los valores hex son los de Odyssey sin retocar. Antes de construir hay que **ajustarlos para
   contraste AA** — algunos no pasan tal cual
