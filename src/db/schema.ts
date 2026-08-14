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
  "qr_escaneado",
  "alerta_creada",
  "alerta_resuelta",
  "contacto_registrado",
  "resultado_solicitado",
  "resultado_listo",
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
    // Dato sintético: marca explícita para la interfaz y para auditoría.
    esSintetico: boolean("es_sintetico").notNull().default(true),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("paciente_departamento_idx").on(t.departamento)]
);

export const cuidador = pgTable("cuidador", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  telefono: varchar("telefono", { length: 20 }),
  relacion: varchar("relacion", { length: 50 }).notNull(), // madre, padre, tutor...
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
// Relaciones (para queries con `with` de Drizzle)
// ---------------------------------------------------------------------------

export const pacienteRelations = relations(paciente, ({ many }) => ({
  rutas: many(ruta),
  cuidadores: many(pacienteCuidador),
  alertas: many(alerta),
  resultados: many(resultadoLab),
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
