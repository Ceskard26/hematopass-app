import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  date,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Modelo de dominio de Hematopass.
 * Nomenclatura alineada a HL7 FHIR (Patient, CarePlan, Task, Location,
 * Provenance, Flag, Communication) sin montar un servidor FHIR completo.
 * Ver docs/arquitectura.md §5 para el mapeo conceptual.
 *
 * Regla dura: `evento` es append-only y es la FUENTE DE VERDAD. El estado
 * actual de cada `paso` se escribe también en la tabla por performance de
 * lectura, pero toda transición debe insertar un `evento` — sin excepciones.
 * La bitácora es lo que da auditoría médico-legal y alimenta el panel de
 * impacto sin instrumentación adicional.
 *
 * Todos los datos que este esquema almacena en producción de demo son
 * SINTÉTICOS (ver src/db/seed.ts). Ningún dato real de paciente debe
 * ingresar nunca a esta base, conforme al punto 11.7 de las bases.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const rolUsuarioEnum = pgEnum("rol_usuario", [
  "medico",
  "gestor",
  "ventanilla",
  "admin",
]);

export const sexoEnum = pgEnum("sexo", ["M", "F"]);

export const tipoUbicacionEnum = pgEnum("tipo_ubicacion", [
  "admision",
  "caja_sis",
  "triaje",
  "consultorio",
  "laboratorio",
  "banco_sangre",
  "farmacia",
  "imagenes",
  "referencias",
]);

export const faseTratamientoEnum = pgEnum("fase_tratamiento", [
  "diagnostico",
  "induccion",
  "consolidacion",
  "mantenimiento",
  "seguimiento",
  "transfusion_cronica",
  "profilaxis",
]);

export const estadoRutaEnum = pgEnum("estado_ruta", [
  "activa",
  "completada",
  "suspendida",
]);

export const tipoPasoEnum = pgEnum("tipo_paso", [
  "consulta",
  "laboratorio",
  "imagen",
  "farmacia",
  "transfusion",
  "tramite_sis",
  "referencia",
  "control",
]);

export const estadoPasoEnum = pgEnum("estado_paso", [
  "programado",
  "notificado",
  "en_curso",
  "completado",
  "vencido",
  "reprogramado",
  "no_asistio",
]);

export const tipoEventoEnum = pgEnum("tipo_evento", [
  "paso_creado",
  "paso_notificado",
  "paso_iniciado",
  "paso_completado",
  "paso_vencido",
  "paso_reprogramado",
  "paso_no_asistio",
  "paso_nota_actualizada",
  "paso_confirmado",
  "termometro_registrado",
  "qr_escaneado",
  "alerta_creada",
  "alerta_resuelta",
  "alerta_descartada",
  "contacto_registrado",
  "resultado_solicitado",
  "resultado_listo",
  "mensaje_enviado",
  "decision_clinica_registrada",
  "derivacion_servicio_social",
  "preferencia_canal_actualizada",
]);

// Confirmación de asistencia del cuidador a un paso programado (P7 del
// brief de rediseño de la app del cuidador).
export const confirmacionAsistenciaEnum = pgEnum("confirmacion_asistencia", [
  "si",
  "no",
  "sin_responder",
]);

// Termómetro emocional: caritas que el cuidador marca antes de una consulta
// (P9). Escala de 5 puntos — el brief solo pedía "caritas", sin especificar
// cuántas; 5 es el estándar más común en escalas de ánimo pediátricas.
export const termometroEmocionalEnum = pgEnum("termometro_emocional", [
  "muy_mal",
  "mal",
  "regular",
  "bien",
  "muy_bien",
]);

// Decisión clínica sobre el plan de tratamiento de una ruta (D6). Deliberadamente
// desacoplada del motor de riesgo: registrar "derivar" aquí no dispara ninguna
// alerta automática — son dos mecanismos distintos, uno es la decisión
// explícita del médico, el otro es detección pasiva de riesgo.
export const decisionClinicaEnum = pgEnum("decision_clinica", [
  "continuar",
  "ajustar",
  "derivar",
]);

// ---------------------------------------------------------------------------
// Usuarios (personal clínico y administrativo)
// ---------------------------------------------------------------------------

export const usuario = pgTable("usuario", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  rol: rolUsuarioEnum("rol").notNull(),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Paciente y cuidador
// ---------------------------------------------------------------------------

export const paciente = pgTable(
  "paciente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codigo: varchar("codigo", { length: 20 }).notNull().unique(), // ej. HP-00042
    nombre: varchar("nombre", { length: 200 }).notNull(),
    fechaNacimiento: date("fecha_nacimiento").notNull(),
    sexo: sexoEnum("sexo").notNull(),
    dxCie10: varchar("dx_cie10", { length: 10 }).notNull(),
    dxNombre: varchar("dx_nombre", { length: 200 }).notNull(),
    departamento: varchar("departamento", { length: 100 }).notNull(),
    esProvincia: boolean("es_provincia").notNull().default(false),
    faseTratamiento: faseTratamientoEnum("fase_tratamiento").notNull(),
    // Médico tratante ACTUAL — distinto de ruta.creadaPor, que es histórico
    // por ruta (quién generó ese tramo del tratamiento). Este campo es el que
    // la familia ve en su pantalla de bienvenida ("tu médico es...") y el que
    // alimenta la carga por profesional en el panel del doctor.
    medicoTratanteId: uuid("medico_tratante_id").references(() => usuario.id),
    // Presencia de fecha = derivado (mismo patrón que resueltaEn/completadoEn
    // en otras tablas — más auditable que un booleano suelto).
    derivadoServicioSocialEn: timestamp("derivado_servicio_social_en", { withTimezone: true }),
    derivadoServicioSocialPor: uuid("derivado_servicio_social_por").references(() => usuario.id),
    // Dato sintético: marca explícita para la interfaz y para auditoría.
    esSintetico: boolean("es_sintetico").notNull().default(true),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("paciente_departamento_idx").on(t.departamento)]
);

export const cuidador = pgTable("cuidador", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  // Segundo factor del ingreso del cuidador: el código del pasaporte lo
  // entrega el personal clínico en persona (solo lo tiene quien ya fue
  // verificado en Admisión), pero por sí solo no prueba QUIÉN lo tiene en
  // la mano. El DNI, verificado contra el registro que cargó el personal
  // clínico, cierra ese hueco sin requerir cuenta ni contraseña.
  dni: varchar("dni", { length: 8 }),
  telefono: varchar("telefono", { length: 20 }),
  relacion: varchar("relacion", { length: 50 }).notNull(), // madre, padre, tutor...
  // Solo se persiste la preferencia — no hay proveedor de SMS/WhatsApp
  // integrado en este repo, envío real está fuera de alcance.
  canalPreferido: varchar("canal_preferido", { length: 20 }).notNull().default("app"), // app | sms | whatsapp
  // Un cuidador puede acceder a la app sin cuenta médica formal: PIN simple.
  pinHash: text("pin_hash"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

// Un cuidador puede tener varios pacientes (hermanos); un paciente puede
// tener varios cuidadores. Muchos hogares comparten un solo celular.
export const pacienteCuidador = pgTable(
  "paciente_cuidador",
  {
    pacienteId: uuid("paciente_id")
      .notNull()
      .references(() => paciente.id, { onDelete: "cascade" }),
    cuidadorId: uuid("cuidador_id")
      .notNull()
      .references(() => cuidador.id, { onDelete: "cascade" }),
    esPrincipal: boolean("es_principal").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.pacienteId, t.cuidadorId] })]
);

// ---------------------------------------------------------------------------
// Ubicación (ventanillas físicas, cada una con su QR estático)
// ---------------------------------------------------------------------------

export const ubicacion = pgTable("ubicacion", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 100 }).notNull(), // "Farmacia"
  tipo: tipoUbicacionEnum("tipo").notNull(),
  piso: varchar("piso", { length: 20 }).notNull(), // "Piso 1"
  modulo: varchar("modulo", { length: 20 }), // "Módulo B"
  ventanilla: varchar("ventanilla", { length: 20 }), // "Ventanilla 2"
  qrToken: varchar("qr_token", { length: 64 }).notNull().unique(),
});

// ---------------------------------------------------------------------------
// Ruta y paso — la máquina de estados del tratamiento
// ---------------------------------------------------------------------------

export const ruta = pgTable("ruta", {
  id: uuid("id").primaryKey().defaultRandom(),
  pacienteId: uuid("paciente_id")
    .notNull()
    .references(() => paciente.id, { onDelete: "cascade" }),
  protocolo: varchar("protocolo", { length: 100 }).notNull(),
  fase: faseTratamientoEnum("fase").notNull(),
  estado: estadoRutaEnum("estado").notNull().default("activa"),
  creadaPor: uuid("creada_por").references(() => usuario.id),
  creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
  // Última decisión clínica sobre este plan de tratamiento (D6). No dispara
  // alertas del motor de riesgo — ver comentario en decisionClinicaEnum.
  ultimaDecision: decisionClinicaEnum("ultima_decision"),
  ultimaDecisionEn: timestamp("ultima_decision_en", { withTimezone: true }),
  ultimaDecisionPor: uuid("ultima_decision_por").references(() => usuario.id),
});

export const paso = pgTable(
  "paso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rutaId: uuid("ruta_id")
      .notNull()
      .references(() => ruta.id, { onDelete: "cascade" }),
    orden: integer("orden").notNull(),
    tipo: tipoPasoEnum("tipo").notNull(),
    ubicacionId: uuid("ubicacion_id").references(() => ubicacion.id),
    // Dos títulos para el mismo hecho — el producto entero en dos columnas.
    tituloClinico: varchar("titulo_clinico", { length: 200 }).notNull(),
    instruccionCuidador: text("instruccion_cuidador").notNull(),
    estado: estadoPasoEnum("estado").notNull().default("programado"),
    programadoPara: timestamp("programado_para", { withTimezone: true }),
    venceEn: timestamp("vence_en", { withTimezone: true }),
    completadoEn: timestamp("completado_en", { withTimezone: true }),
    // Nota libre del médico sobre este paso (indicación, conclusión de la
    // consulta, diagnóstico) — visible para el cuidador. Decisión explícita
    // del producto de reemplazar la regla original de "nunca mostrar
    // diagnóstico completo" (docs/sistema-de-diseno.md §6.2), a pedido
    // directo del usuario: la familia quiere ver qué concluyó/recetó el
    // médico, no solo a dónde ir.
    notaMedica: text("nota_medica"),
    // Confirmación del cuidador de que asistirá a este paso (P7).
    confirmacionAsistencia: confirmacionAsistenciaEnum("confirmacion_asistencia")
      .notNull()
      .default("sin_responder"),
    confirmadoEn: timestamp("confirmado_en", { withTimezone: true }),
    // Caritas que el cuidador marca antes de una consulta (P9). Nullable:
    // la mayoría de pasos nunca lo tendrán (no son pre-consulta).
    termometroEmocional: termometroEmocionalEnum("termometro_emocional"),
    termometroRegistradoEn: timestamp("termometro_registrado_en", { withTimezone: true }),
    creadoPor: uuid("creado_por").references(() => usuario.id),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("paso_ruta_idx").on(t.rutaId),
    index("paso_estado_idx").on(t.estado),
  ]
);

// ---------------------------------------------------------------------------
// Evento — bitácora append-only, fuente de verdad
// ---------------------------------------------------------------------------

export const evento = pgTable(
  "evento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entidadTipo: varchar("entidad_tipo", { length: 30 }).notNull(), // "paso" | "paciente" | "alerta"
    entidadId: uuid("entidad_id").notNull(),
    tipo: tipoEventoEnum("tipo").notNull(),
    actorId: uuid("actor_id").references(() => usuario.id),
    actorRol: varchar("actor_rol", { length: 30 }),
    payload: jsonb("payload").notNull().default({}),
    origen: varchar("origen", { length: 30 }).notNull().default("web"), // web | qr | sistema
    ocurridoEn: timestamp("ocurrido_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("evento_entidad_idx").on(t.entidadTipo, t.entidadId),
    index("evento_ocurrido_idx").on(t.ocurridoEn),
  ]
);

// ---------------------------------------------------------------------------
// Alerta — salida del motor de riesgo (F5)
// ---------------------------------------------------------------------------

export const severidadAlertaEnum = pgEnum("severidad_alerta", [
  "media",
  "alta",
  "critica",
]);

export const estadoAlertaEnum = pgEnum("estado_alerta", [
  "activa",
  "en_seguimiento",
  "resuelta",
  "descartada",
]);

export const reglaAlertaEnum = pgEnum("regla_alerta", [
  "R1_abandono",
  "R2_paso_vencido",
  "R3_inasistencias",
  "R4_resultado_huerfano",
  "R5_viaje_en_riesgo",
]);

export const alerta = pgTable(
  "alerta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pacienteId: uuid("paciente_id")
      .notNull()
      .references(() => paciente.id, { onDelete: "cascade" }),
    regla: reglaAlertaEnum("regla").notNull(),
    severidad: severidadAlertaEnum("severidad").notNull(),
    motivoTexto: text("motivo_texto").notNull(),
    estado: estadoAlertaEnum("estado").notNull().default("activa"),
    creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
    resueltaEn: timestamp("resuelta_en", { withTimezone: true }),
  },
  (t) => [
    index("alerta_paciente_idx").on(t.pacienteId),
    index("alerta_estado_idx").on(t.estado),
  ]
);

export const contacto = pgTable("contacto", {
  id: uuid("id").primaryKey().defaultRandom(),
  alertaId: uuid("alerta_id")
    .notNull()
    .references(() => alerta.id, { onDelete: "cascade" }),
  usuarioId: uuid("usuario_id").references(() => usuario.id),
  canal: varchar("canal", { length: 30 }).notNull(), // llamada | sms | whatsapp | presencial
  resultado: varchar("resultado", { length: 50 }).notNull(), // contactado | no_respondio | numero_invalido
  nota: text("nota"),
  ocurridoEn: timestamp("ocurrido_en", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Resultado de laboratorio — alimenta R4 y R5
// ---------------------------------------------------------------------------

export const estadoResultadoEnum = pgEnum("estado_resultado", [
  "pendiente",
  "listo",
  "entregado",
]);

export const resultadoLab = pgTable("resultado_lab", {
  id: uuid("id").primaryKey().defaultRandom(),
  pacienteId: uuid("paciente_id")
    .notNull()
    .references(() => paciente.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 100 }).notNull(), // "Hemograma completo"
  solicitadoEn: timestamp("solicitado_en", { withTimezone: true }).notNull().defaultNow(),
  listoEn: timestamp("listo_en", { withTimezone: true }),
  estado: estadoResultadoEnum("estado").notNull().default("pendiente"),
});

// ---------------------------------------------------------------------------
// Mensaje — chat de dos vías entre cuidador y equipo tratante (P8/D5)
// ---------------------------------------------------------------------------

export const mensaje = pgTable(
  "mensaje",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pacienteId: uuid("paciente_id")
      .notNull()
      .references(() => paciente.id, { onDelete: "cascade" }),
    autorTipo: varchar("autor_tipo", { length: 20 }).notNull(), // cuidador | medico
    // Solo uno de los dos está poblado, según autorTipo.
    autorCuidadorId: uuid("autor_cuidador_id").references(() => cuidador.id),
    autorUsuarioId: uuid("autor_usuario_id").references(() => usuario.id),
    cuerpo: text("cuerpo").notNull(),
    leidoEn: timestamp("leido_en", { withTimezone: true }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mensaje_paciente_idx").on(t.pacienteId)]
);

// ---------------------------------------------------------------------------
// Relaciones (para queries con `with` de Drizzle)
// ---------------------------------------------------------------------------

export const pacienteRelations = relations(paciente, ({ one, many }) => ({
  rutas: many(ruta),
  cuidadores: many(pacienteCuidador),
  alertas: many(alerta),
  resultados: many(resultadoLab),
  mensajes: many(mensaje),
  medicoTratante: one(usuario, {
    fields: [paciente.medicoTratanteId],
    references: [usuario.id],
  }),
}));

export const mensajeRelations = relations(mensaje, ({ one }) => ({
  paciente: one(paciente, {
    fields: [mensaje.pacienteId],
    references: [paciente.id],
  }),
  autorCuidador: one(cuidador, {
    fields: [mensaje.autorCuidadorId],
    references: [cuidador.id],
  }),
  autorUsuario: one(usuario, {
    fields: [mensaje.autorUsuarioId],
    references: [usuario.id],
  }),
}));

export const resultadoLabRelations = relations(resultadoLab, ({ one }) => ({
  paciente: one(paciente, {
    fields: [resultadoLab.pacienteId],
    references: [paciente.id],
  }),
}));

export const cuidadorRelations = relations(cuidador, ({ many }) => ({
  pacientes: many(pacienteCuidador),
}));

export const pacienteCuidadorRelations = relations(pacienteCuidador, ({ one }) => ({
  paciente: one(paciente, {
    fields: [pacienteCuidador.pacienteId],
    references: [paciente.id],
  }),
  cuidador: one(cuidador, {
    fields: [pacienteCuidador.cuidadorId],
    references: [cuidador.id],
  }),
}));

export const rutaRelations = relations(ruta, ({ one, many }) => ({
  paciente: one(paciente, {
    fields: [ruta.pacienteId],
    references: [paciente.id],
  }),
  pasos: many(paso),
}));

export const pasoRelations = relations(paso, ({ one }) => ({
  ruta: one(ruta, { fields: [paso.rutaId], references: [ruta.id] }),
  ubicacion: one(ubicacion, {
    fields: [paso.ubicacionId],
    references: [ubicacion.id],
  }),
}));

export const alertaRelations = relations(alerta, ({ one, many }) => ({
  paciente: one(paciente, {
    fields: [alerta.pacienteId],
    references: [paciente.id],
  }),
  contactos: many(contacto),
}));

export const contactoRelations = relations(contacto, ({ one }) => ({
  alerta: one(alerta, { fields: [contacto.alertaId], references: [alerta.id] }),
  usuario: one(usuario, { fields: [contacto.usuarioId], references: [usuario.id] }),
}));
