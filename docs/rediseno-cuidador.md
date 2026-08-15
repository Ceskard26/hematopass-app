# Rediseño de la app del cuidador — estado y pendientes

Documento de trabajo para retomar el rediseño (mascota, pantallas nuevas del
brief P1-P11/D1-D8). Plan completo original:
`/Users/cesarcarrasco/.claude/plans/zesty-greeting-falcon.md`.

## Backend

### Hecho (Fase 0 — esquema, en producción y local)

- `paciente.medicoTratanteId` (fk usuario) — médico tratante actual.
- `paciente.derivadoServicioSocialEn/Por`.
- `cuidador.canalPreferido` (solo se persiste, sin envío real de SMS/WhatsApp).
- `paso.confirmacionAsistencia` + `confirmadoEn`.
- `paso.termometroEmocional` (5 puntos) + `termometroRegistradoEn`.
- `ruta.ultimaDecision/decisionEn/decisionPor` — desacoplado del motor de
  riesgo, no dispara alertas.
- Tabla `mensaje` nueva (chat cuidador↔doctor, aún sin actions/queries ni
  pantallas — ver Fase 5 pendiente).
- 6 tipos de evento nuevos en `tipoEventoEnum`.
- `seed.ts`: 3 médicos sintéticos (antes 1), `medicoTratanteId` poblado.
- `docs/modelo-de-datos.md` actualizado con todo esto.

### Pendiente (Fases 3-5 del plan)

- **Fase 3** — acciones de escritura por-paso: confirmar asistencia (P7),
  termómetro emocional (P9), card de recordatorio real desde `evento` (P6),
  pantalla de canal preferido (P2).
- **Fase 4** — escrituras del doctor: decisión clínica (D6), derivación a
  servicio social (D8), distribución de carga por médico (D7, ya está
  `medicoTratanteId` poblado, falta la query agregada + la vista).
- **Fase 5** — mensajería real (P8/D5): `actions-mensajes.ts`,
  `queries-mensajes.ts`, ambas pantallas, wiring a `realtime.ts`/SSE. Es la
  pieza más grande que queda.

## Frontend

### Hecho (Fases 1-2)

- Paleta pastel nueva solo en `[data-surface="caregiver"]`
  (`src/app/globals.css`) — verde agua + crema. `[data-surface="clinical"]`
  sin cambios, confirmado.
- `src/components/mascota.tsx` — SVG a mano, 3 estados
  (feliz/animando/celebrando), aplicada hoy solo en la pantalla de entrada
  del cuidador (`ingreso-cuidador-form.tsx`).
- Semáforo de riesgo (D1/D4) en `/clinico` — `semaforo-riesgo.tsx`.
- P11 (resumen post-consulta) — `/cuidador/resumen/[pasoId]`.
- Placeholder de alojamiento — `/cuidador/alojamiento`, gateado por
  `esProvincia`.

### ⚠️ Correcciones directas del usuario — hacer ANTES de seguir con fases nuevas

1. ✅ **HECHO** — El escaneo de QR ya no está en la pantalla de entrada/login.
   `IngresoCuidadorForm` (`src/components/ingreso-cuidador-form.tsx`) quedó
   solo con DNI + código de pasaporte (dos inputs de texto, sin cámara). Se
   quitó todo el estado/lógica de `html5-qrcode` de ese componente. El
   escaneo de QR de ventanilla sigue igual en `/cuidador/escanear`
   (accesible desde el nav inferior, tab "Escanear") — es un flujo aparte
   para validar pasos físicos, no se tocó. Verificado en local con Docker:
   login de cuidador (`HP-90001` / `72191309`) y login de médico
   (`medico@demo.hematopass.pe` / contraseña de demo) ambos funcionan.

2. ✅ **HECHO** — Rehecho contra las 3 referencias que mandó el usuario
   (Adventure Map / droplet-character / adventure-game-screen), con datos
   reales (nada mock):
   - `/cuidador/ahora` (`src/app/cuidador/ahora/page.tsx`) → estilo
     "Adventure Map": eyebrow "Mapa de la ruta", saludo "Hola, {cuidador}",
     tarjeta "Cuidando a {paciente}", tarjeta de estación actual (durazno,
     `--station-current-bg`) con badges de piso/ventanilla/horario y el CTA
     "Escanear código" dentro, tarjeta "Sigue después" (amarillo,
     `--station-next-bg`) cuando hay un próximo paso `programado`, botón
     coral "Compartir avance por WhatsApp" (deep link real `wa.me`, sin
     backend nuevo), tarjeta de alojamiento (menta) gateada por
     `esProvincia`, tarjeta de consejo logístico (rota por día, nunca
     consejo clínico).
   - `/cuidador/pasaporte` (`src/app/cuidador/pasaporte/page.tsx`) → mapa
     tipo "Treasure Map": mascota con burbuja de diálogo (mensaje real
     según `pasoActual`), badge "★ Nivel {sellados}" (sellados reales, no
     XP inventado), y el listado de pasos convertido en columna de nodos
     `Sello` (64px) conectados por línea vertical punteada — completado
     (sólido, línea coloreada), activo (mismo Sello + anillo + badge
     "Activo"), bloqueado (`estado="vacio"` + etiqueta "Bloqueado", sin
     detalle). Reutiliza `Sello` tal cual, sin inventar un ícono de isla
     nuevo.
   - Nav inferior: "Pasaporte" → "Mapa" (`src/components/nav-cuidador.tsx`).
   - Tokens nuevos en `[data-surface="caregiver"]`
     (`src/app/globals.css`): `--station-current-*`, `--station-next-*`,
     `--station-accent-*`, `--station-share-*` (reutiliza `--mascot-body`
     para el coral de WhatsApp).
   - Nueva query `obtenerCuidador(cuidadorId)` en `queries-cuidador.ts` —
     antes la sesión solo guardaba ids, no había forma de saludar por
     nombre.
   - **Deliberadamente NO se agregó** un sistema de monedas/vidas/XP falso
     (visto en las referencias) — no hay economía de puntos en el backend y
     inventar una habría violado la regla de esta sesión de "conectar al
     backend real, nada mock". "Nivel" se ancla a sellos reales.
   - Verificado en local (Docker) con el paciente ficticio `HP-90001` /
     DNI `72191309`, en viewport móvil (375×812), y confirmado que
     `/clinico` no cambió visualmente.

### ✅ Ronda 3 — mascota real "Globi" + lado médico (contacto, ventanilla)

1. **Mascota reemplazada por las ilustraciones reales que subió el usuario**
   a `/public` (`globi-*-remove-bg-io.{png,webp}`). `src/components/mascota.tsx`
   ya no dibuja un SVG a mano — mapea 7 estados a 7 archivos reales, cada
   uno con la pose correcta para su contexto (no una sola imagen genérica
   reciclada):
   - `feliz` → `globi-bienvenida` (saluda con un mapa) — pantalla de login.
   - `animando` → `globi-aventurero` (sombrero explorador) — mapa de ruta.
   - `celebrando` → `globi-conmedalla` (medalla, brazos arriba) — todo al
     día / sin más pasos.
   - `calendario` → `globi-calendario` (señala un calendario) — próxima
     cita en el resumen post-consulta.
   - `notas` → `globi-connotaspostconsulta` (tablero + lápiz) — sección
     "Qué te dijo el equipo" en el resumen.
   - `aprobando` → `globi-dandook` (pulgar arriba) — reservado para
     confirmaciones (Fase 3, P7).
   - `empatico` → `globi-empatico` (mano en el pecho) — reservado para
     pantallas de espera/alerta (Fase 3, P9).
   - Misma API pública (`estado`, `size`, `className`), cero cambios en los
     call sites salvo remapear `estado` donde el nuevo archivo encajaba
     mejor (login → `feliz`, "próximo paso" en resumen → `calendario`).

2. **Visibilidad de contacto por paciente en el lado médico** — pedido
   explícito: "así como está en la vista de paciente contactarse". Antes
   `cuidador.telefono` existía en el esquema pero no se mostraba en NINGUNA
   pantalla clínica. Nuevo componente compartido
   `src/components/contacto-cuidadores.tsx` (llamar = `tel:`, WhatsApp =
   `wa.me` con mensaje prellenado — mismo patrón real, sin backend nuevo,
   que el botón de "Compartir avance" del cuidador), usado en:
   - `/clinico` (tabla de pacientes) — columna "Contacto" nueva, solo
     iconos, cuidador principal.
   - `/clinico/[codigo]` (ficha) — sección "Contacto" completa en el aside,
     todos los cuidadores.
   - `/riesgo` (bandeja de riesgo) — bloque compacto con nombre + relación
     + iconos bajo cada alerta, para contactar sin salir de la bandeja.
   - `/ventanilla` — ver punto 3.
   - Requirió sumar `cuidadores: { with: { cuidador: true } }` a
     `listarPacientesClinico` (`src/lib/queries.ts`) y a
     `listarAlertasActivas` (`src/lib/queries-riesgo.ts`); `obtenerPacienteDetalle`
     ya la traía.

3. **`/ventanilla` dejó de ser un stub** ("F3 en construcción"). Ahora es una
   búsqueda funcional por código de pasaporte
   (`src/app/(staff)/ventanilla/page.tsx`, reutiliza `obtenerPacienteDetalle`,
   sin query nueva): muestra pasos pendientes de esa ruta y el contacto de
   la familia. Verificado con el usuario `ventanilla@demo.hematopass.pe` —
   antes ese rol no tenía ninguna pantalla real que usar.

4. **Deliberadamente NO se tocó** el motor de riesgo, `RegistrarContactoForm`
   ni `DescartarAlertaButton` — el nuevo bloque de contacto es puramente de
   lectura/enlace, no reemplaza el registro de intentos de contacto que ya
   existía.

Verificado en local (Docker): tabla de pacientes, bandeja de riesgo, ficha
de paciente, ventanilla (con sesión `ventanilla@demo.hematopass.pe`), y las
pantallas de cuidador con las imágenes reales de Globi — todo con capturas
en el navegador, no solo build limpio.

### ✅ Ronda 4 — menos "cuadrados", mascota más grande, paciente de prueba renombrado

1. **Paciente ficticio renombrado**: `Mateo Ficticio Prueba` → `Luana Ficticia
   Prueba` (mismo código `HP-90001`, mismo DNI de cuidador `72191309`) — solo
   en la base local por ahora (`UPDATE paciente SET nombre = ...`). **Falta
   aplicar el mismo cambio en producción** si se quiere el mismo nombre ahí
   — no se tocó producción sin confirmación.

2. **Menos marcos rectangulares apilados** (`/cuidador/ahora` y
   `/cuidador/pasaporte`) — el usuario lo notó como "demasiados cuadrados
   como frames". Se quitaron los `border` de las tarjetas de color
   (estación actual/siguiente, alojamiento) y de los contenedores blancos
   (mascota+mensaje, resultados, estado vacío), reemplazados por
   `shadow-sm` — el color/sombra ya distingue la tarjeta, el borde duro era
   redundante. La tarjeta "Cuidando a" y el consejo del día dejaron de ser
   cajas independientes: ahora son texto simple con ícono, sin fondo ni
   borde. En "Mapa", "Resultados" pasó de N cajas sueltas a una sola
   tarjeta con divisores internos, y el contenedor grande que envolvía "Tu
   ruta" se quitó por completo — los nodos del mapa ahora flotan
   directamente sobre el fondo de la pantalla.

3. **Mascota más grande**: login 128px → 176px; estado vacío de "Ahora"
   88px → 140px; burbuja de diálogo en "Mapa" 76px → 112px.

Verificado en local (Docker) en viewport móvil — capturas confirman que ya
no hay marcos duplicados y que Globi se ve grande y claro en ambas
pantallas.

### ✅ Ronda 5 — ilustraciones reales por tipo de paso + sello de nivel

1. **`src/components/sello.tsx`** ahora usa las ilustraciones reales que
   subió el usuario (`farmacia-remove-bg-io.png`,
   `laboratorio-remove-bg-io.png`, `estetoscopio-consulta-remove-bg-io.png`)
   para `tipo="farmacia"|"laboratorio"|"consulta"` — reemplazan el
   hexágono+trazo abstracto SOLO para esos tres tipos. Los tipos sin
   ilustración (`imagen`, `transfusion`, `tramite_sis`, `referencia`,
   `control`) siguen con el hexágono de siempre, sin arte inventado. Estado
   `vacio` (bloqueado) aplica escala de grises + opacidad baja sobre la
   misma imagen en vez de un placeholder aparte. Como `Sello` es un
   componente compartido, el cambio se propaga automáticamente a las tres
   pantallas donde se usa: `/cuidador/pasaporte` (mapa), `/cuidador/resumen/[pasoId]`,
   y la pantalla de éxito de `qr-scanner.tsx`.

2. **Sello de "Nivel"**: `sellonivel2.jpeg` (el droplet con medalla y marco
   de soga) reemplaza la píldora de texto "★ Nivel N" del header del mapa
   **solo cuando el nivel alcanzado tiene imagen** — hoy solo nivel 2. Está
   armado como un mapa `NIVEL_SELLO: Record<number, string>` en
   `pasaporte/page.tsx`, así que agregar `nivel1.jpeg`, `nivel3.jpeg`, etc.
   más adelante es una línea, sin tocar la lógica. Los niveles sin imagen
   siguen con la píldora de estrella de siempre.

Verificado en local (Docker) — el mapa de ruta ahora muestra las
ilustraciones reales en cada nodo (consultorio, laboratorio, farmacia) y el
badge de nivel con el sello ilustrado.

### ✅ Ronda 6 — corrección de tamaño: farmacia/laboratorio/nivel se veían chicos

Causa raíz: `farmacia-remove-bg-io.png` y `laboratorio-remove-bg-io.png`
(igual que `sellonivel2.jpeg`) vienen en un lienzo panorámico
(2816×1536) con el círculo real ocupando solo ~45% del ancho — mucho
margen transparente a los costados. `estetoscopio-consulta-remove-bg-io.png`
en cambio ya venía en lienzo cuadrado (2048×2048) con el círculo ocupando
~93%. Como `Sello` renderiza con `object-fit: contain` en una caja
cuadrada, el margen extra de las primeras dos hacía que se vieran mucho
más chicas que la de consulta a igual `size`.

Arreglo: recorté las tres (vía PIL, detectando la caja del contenido real y
centrando un cuadrado ceñido a ella) y guardé las versiones nuevas en
`/public`: `laboratorio-cropped.png`, `farmacia-cropped.png`,
`sellonivel2-cropped.jpg`. `src/components/sello.tsx` y
`src/app/cuidador/pasaporte/page.tsx` apuntan a estas versiones — los
archivos originales quedan en `/public` sin usarse, no se borraron. También
subí el sello de nivel de 28px a 44px, era ilegible a ese tamaño incluso ya
recortado.

## Cómo levantar en local para verificar

```bash
cd /Users/cesarcarrasco/Desktop/Hackathones/insnb/hematopass-app
docker compose up -d --build
```

`http://localhost` — paciente ficticio de prueba: código `HP-90001`, DNI
`72191309` (no está en el seed, si se resiembra hay que recrearlo — script
en scratchpad de la sesión, o pedir que se rehaga).

## Producción

`https://dinjztoedh2z9.cloudfront.net` — Fases 0-2 ya desplegadas
(confirmado con el usuario antes de cada migración de esquema). Mismo
paciente ficticio de prueba creado ahí también (`HP-90001` / `72191309`).
