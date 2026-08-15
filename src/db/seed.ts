// El .env.local se carga vía `tsx --env-file` en el script npm (ver
// package.json), NO con dotenv aquí: los `import` de este archivo se
// hoistean por encima de cualquier código de nivel superior, así que una
// llamada a dotenv.config() en este punto se ejecutaría DESPUÉS de que
// "./index" ya haya leído (y cacheado) process.env.DATABASE_URL — demasiado
// tarde. docker compose no tiene este problema: pasa las env vars
// directamente al proceso, sin dotenv de por medio.
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "./index";
import {
  usuario,
  paciente,
  cuidador,
  pacienteCuidador,
  ubicacion,
  ruta,
  paso,
  evento,
  resultadoLab,
} from "./schema";

/**
 * Siembra de datos SINTÉTICOS para Hematopass.
 *
 * Ningún nombre, DNI, ni dato clínico de este archivo corresponde a una
 * persona real. Los nombres son combinaciones genéricas de nombres y
 * apellidos peruanos comunes, generadas para dar verosimilitud a la demo
 * — no identifican a nadie. Ver docs/plan-desarrollo.md §5 y bases del
 * hackatón, punto 11.7.
 *
 * Idempotente: puede correr muchas veces (usado por `docker compose up`
 * en cada rebuild del demo). Limpia las tablas de dominio antes de sembrar.
 */

const DEMO_PASSWORD = "Hematopass2026!";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// DNI peruano sintético: 8 dígitos. No corresponde a ningún documento real.
function generarDni(): string {
  return String(Math.floor(10000000 + Math.random() * 89999999));
}

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function daysFromNow(d: number): Date {
  return hoursFromNow(d * 24);
}

const NOMBRES = [
  "Mateo", "Valentina", "Sebastián", "Camila", "Diego", "Luciana", "Joaquín",
  "Fernanda", "Adrián", "Ariana", "Nicolás", "Rafaella", "Emiliano",
  "Antonella", "Thiago", "Génesis", "Benjamín", "Milagros", "Gael", "Zoe",
  "Ian", "Abril", "Santiago", "Kiara",
] as const;

const APELLIDOS = [
  "Quispe", "Mamani", "Flores", "Huamán", "Rojas", "Vargas", "Torres",
  "Chávez", "Ramos", "Cruz", "Reyes", "Paredes", "Salazar", "Cárdenas",
  "Aguilar", "Palomino", "Ccahuana", "Yupanqui", "Medina", "Espinoza",
] as const;

const NOMBRES_ADULTOS = [
  "María", "Rosa", "Juana", "Carmen", "Luz", "Elena", "Pedro", "Juan",
  "Carlos", "Miguel", "Luis", "Jorge", "Marisol", "Yolanda", "Teófilo",
] as const;

const RELACIONES = ["madre", "padre", "abuela", "tía", "tutor legal"] as const;

const DEPARTAMENTOS_PROVINCIA = [
  "Junín", "Áncash", "Lambayeque", "Loreto", "Cusco", "Piura", "Arequipa",
  "Ica", "La Libertad", "Cajamarca", "Ucayali", "San Martín", "Puno",
] as const;

type Diagnostico = {
  cie10: string;
  nombre: string;
  fase: (typeof faseOpciones)[number];
  protocolo: string;
};

const faseOpciones = [
  "diagnostico", "induccion", "consolidacion", "mantenimiento", "seguimiento",
  "transfusion_cronica", "profilaxis",
] as const;

const DIAGNOSTICOS: Diagnostico[] = [
  { cie10: "C91.0", nombre: "Leucemia linfoblástica aguda", fase: "induccion", protocolo: "LLA — Protocolo Perú-INEN 2014" },
  { cie10: "C91.0", nombre: "Leucemia linfoblástica aguda", fase: "consolidacion", protocolo: "LLA — Protocolo Perú-INEN 2014" },
  { cie10: "C91.0", nombre: "Leucemia linfoblástica aguda", fase: "mantenimiento", protocolo: "LLA — Protocolo Perú-INEN 2014" },
  { cie10: "C92.0", nombre: "Leucemia mieloide aguda", fase: "consolidacion", protocolo: "LMA — Protocolo AML-BFM adaptado" },
  { cie10: "D56.1", nombre: "Talasemia beta", fase: "transfusion_cronica", protocolo: "Transfusión crónica programada" },
  { cie10: "D57.1", nombre: "Anemia falciforme (drepanocitosis)", fase: "seguimiento", protocolo: "Seguimiento hematológico crónico" },
  { cie10: "D61.9", nombre: "Anemia aplásica, no especificada", fase: "induccion", protocolo: "Terapia inmunosupresora" },
  { cie10: "D66", nombre: "Hemofilia A", fase: "profilaxis", protocolo: "Profilaxis con factor VIII" },
  { cie10: "D67", nombre: "Hemofilia B", fase: "profilaxis", protocolo: "Profilaxis con factor IX" },
  { cie10: "D69.3", nombre: "Púrpura trombocitopénica inmune", fase: "seguimiento", protocolo: "Seguimiento PTI" },
];

const UBICACIONES_SEED = [
  { nombre: "Admisión", tipo: "admision" as const, piso: "Piso 1", modulo: "A", ventanilla: "Ventanilla 1" },
  { nombre: "Caja SIS", tipo: "caja_sis" as const, piso: "Piso 1", modulo: "A", ventanilla: "Ventanilla 3" },
  { nombre: "Triaje", tipo: "triaje" as const, piso: "Piso 1", modulo: "B", ventanilla: null },
  { nombre: "Consultorio de Hematología", tipo: "consultorio" as const, piso: "Piso 2", modulo: "C", ventanilla: "Consultorio 5" },
  { nombre: "Laboratorio", tipo: "laboratorio" as const, piso: "Piso 1", modulo: "D", ventanilla: "Ventanilla 2" },
  { nombre: "Banco de Sangre", tipo: "banco_sangre" as const, piso: "Sótano 1", modulo: "E", ventanilla: null },
  { nombre: "Farmacia", tipo: "farmacia" as const, piso: "Piso 1", modulo: "B", ventanilla: "Ventanilla 2" },
  { nombre: "Imágenes", tipo: "imagenes" as const, piso: "Piso 1", modulo: "F", ventanilla: null },
  { nombre: "Referencias y Citas", tipo: "referencias" as const, piso: "Piso 1", modulo: "A", ventanilla: "Ventanilla 4" },
];

const INSTRUCCIONES_CUIDADOR: Record<string, string[]> = {
  consulta: ["Pasa a tu consulta de control con el hematólogo.", "El doctor te espera en el consultorio."],
  laboratorio: ["Ve al Laboratorio a sacarte sangre para el hemograma.", "Toca a la ventanilla de Laboratorio y entrega tu orden."],
  imagen: ["Pasa a Imágenes para tu radiografía.", "En Imágenes te tomarán una placa. No necesitas estar en ayunas."],
  farmacia: ["Recoge tu medicina en Farmacia, ventanilla 2.", "Tu medicamento ya está listo en Farmacia."],
  transfusion: ["Pasa al Banco de Sangre para tu transfusión programada.", "Hoy toca tu transfusión. Ve al Banco de Sangre."],
  tramite_sis: ["Pasa por Caja SIS a validar tu seguro.", "Confirma tu cobertura SIS en la ventanilla 3."],
  referencia: ["Recoge tu carta de referencia en Referencias y Citas.", "Pasa por Referencias para tu siguiente cita."],
  control: ["Pasa a tu control de rutina con el doctor.", "Hoy es tu cita de control."],
};

const TITULOS_CLINICOS: Record<string, string[]> = {
  consulta: ["Evaluación clínica de control", "Consulta de seguimiento hematológico"],
  laboratorio: ["Hemograma completo", "Perfil de coagulación"],
  imagen: ["Radiografía de tórax", "Ecografía abdominal"],
  farmacia: ["Dispensación de quimioterapia oral", "Dispensación de factor de coagulación"],
  transfusion: ["Transfusión de paquete globular", "Transfusión programada"],
  tramite_sis: ["Validación de cobertura SIS", "Trámite de afiliación SIS"],
  referencia: ["Emisión de carta de referencia", "Coordinación de siguiente cita"],
  control: ["Control clínico de rutina", "Evaluación de tolerancia al tratamiento"],
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function limpiar() {
  // Orden inverso a las FK. TRUNCATE ... CASCADE sería más corto, pero el
  // orden explícito documenta las dependencias reales del esquema.
  await db.delete(evento);
  await db.delete(resultadoLab);
  await db.delete(paso);
  await db.delete(ruta);
  await db.delete(pacienteCuidador);
  await db.delete(cuidador);
  await db.delete(paciente);
  await db.delete(ubicacion);
  await db.delete(usuario);
}

async function sembrarUsuarios() {
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const staff = [
    { email: "medico@demo.hematopass.pe", nombre: "Dra. Carla Espinoza", rol: "medico" as const },
    { email: "gestor@demo.hematopass.pe", nombre: "Renzo Aguilar", rol: "gestor" as const },
    { email: "ventanilla@demo.hematopass.pe", nombre: "Personal Ventanilla Farmacia", rol: "ventanilla" as const },
    { email: "admin@demo.hematopass.pe", nombre: "Admin Hematopass", rol: "admin" as const },
  ];
  await db.insert(usuario).values(
    staff.map((s) => ({ email: s.email, nombre: s.nombre, rol: s.rol, passwordHash }))
  );
  console.log(`  usuarios: ${staff.length} (contraseña de demo: ${DEMO_PASSWORD})`);
  return db.select().from(usuario);
}

async function sembrarUbicaciones() {
  await db.insert(ubicacion).values(
    UBICACIONES_SEED.map((u) => ({ ...u, qrToken: nanoid(24) }))
  );
  console.log(`  ubicaciones: ${UBICACIONES_SEED.length}`);
  return db.select().from(ubicacion);
}

let codigoSeq = 1;
function siguienteCodigo() {
  return `HP-${String(codigoSeq++).padStart(5, "0")}`;
}

async function crearPacienteConCuidador(opts: {
  dx: Diagnostico;
  esProvincia: boolean;
  departamento: string;
  edadAnios: number;
  cuidadorExistente?: { id: string };
}) {
  const nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`;
  const fechaNacimiento = new Date();
  fechaNacimiento.setFullYear(fechaNacimiento.getFullYear() - opts.edadAnios);

  const [p] = await db
    .insert(paciente)
    .values({
      codigo: siguienteCodigo(),
      nombre,
      fechaNacimiento: fechaNacimiento.toISOString().slice(0, 10),
      sexo: pick(["M", "F"] as const),
      dxCie10: opts.dx.cie10,
      dxNombre: opts.dx.nombre,
      departamento: opts.departamento,
      esProvincia: opts.esProvincia,
      faseTratamiento: opts.dx.fase,
    })
    .returning();

  let cuidadorId = opts.cuidadorExistente?.id;
  if (!cuidadorId) {
    const [c] = await db
      .insert(cuidador)
      .values({
        nombre: `${pick(NOMBRES_ADULTOS)} ${pick(APELLIDOS)}`,
        dni: generarDni(),
        telefono: `9${Math.floor(10000000 + Math.random() * 89999999)}`,
        relacion: pick(RELACIONES),
      })
      .returning();
    cuidadorId = c.id;
  }

  await db.insert(pacienteCuidador).values({
    pacienteId: p.id,
    cuidadorId,
    esPrincipal: true,
  });

  return { paciente: p, cuidadorId };
}

async function registrarEvento(
  entidadTipo: string,
  entidadId: string,
  tipo: (typeof evento.$inferInsert)["tipo"],
  opts: { ocurridoEn?: Date; actorRol?: string; origen?: string; payload?: Record<string, unknown> } = {}
) {
  await db.insert(evento).values({
    entidadTipo,
    entidadId,
    tipo,
    actorRol: opts.actorRol ?? "sistema",
    origen: opts.origen ?? "sistema",
    payload: opts.payload ?? {},
    ocurridoEn: opts.ocurridoEn ?? new Date(),
  });
}

async function crearRuta(pacienteId: string, dx: Diagnostico, creadaPor?: string) {
  const [r] = await db
    .insert(ruta)
    .values({
      pacienteId,
      protocolo: dx.protocolo,
      fase: dx.fase,
      estado: "activa",
      creadaPor,
    })
    .returning();
  return r;
}

async function crearPaso(
  rutaId: string,
  orden: number,
  tipo: (typeof paso.$inferInsert)["tipo"],
  ubicaciones: { id: string; tipo: string }[],
  opts: {
    estado?: (typeof paso.$inferInsert)["estado"];
    programadoPara?: Date;
    venceEn?: Date;
    completadoEn?: Date;
  } = {}
) {
  const ubicacionMap: Record<string, string> = {
    consulta: "consultorio", laboratorio: "laboratorio", imagen: "imagenes",
    farmacia: "farmacia", transfusion: "banco_sangre", tramite_sis: "caja_sis",
    referencia: "referencias", control: "consultorio",
  };
  const ubicacionTipo = ubicacionMap[tipo];
  const ubicacionCandidatas = ubicaciones.filter((u) => u.tipo === ubicacionTipo);
  const ubicacionId = ubicacionCandidatas.length
    ? pick(ubicacionCandidatas).id
    : pick(ubicaciones).id;

  const [p] = await db
    .insert(paso)
    .values({
      rutaId,
      orden,
      tipo,
      ubicacionId,
      tituloClinico: pick(TITULOS_CLINICOS[tipo]),
      instruccionCuidador: pick(INSTRUCCIONES_CUIDADOR[tipo]),
      estado: opts.estado ?? "programado",
      programadoPara: opts.programadoPara,
      venceEn: opts.venceEn,
      completadoEn: opts.completadoEn,
    })
    .returning();

  await registrarEvento("paso", p.id, "paso_creado", {
    ocurridoEn: opts.completadoEn ?? opts.programadoPara ?? new Date(),
  });
  if (opts.estado === "completado" && opts.completadoEn) {
    await registrarEvento("paso", p.id, "paso_completado", {
      ocurridoEn: opts.completadoEn,
      origen: "qr",
    });
  }
  if (opts.estado === "no_asistio" && opts.programadoPara) {
    await registrarEvento("paso", p.id, "paso_no_asistio", { ocurridoEn: opts.programadoPara });
  }
  return p;
}

// ---------------------------------------------------------------------------
// Los 4 casos guionados de la demo — ver docs/plan-desarrollo.md §5
// ---------------------------------------------------------------------------

async function sembrarCasoA(ubicaciones: { id: string; tipo: string }[], medicoId?: string) {
  // Caso A — Lima, LLA en mantenimiento, ruta al día. El ciclo feliz.
  const dx = DIAGNOSTICOS[2]; // LLA mantenimiento
  const { paciente: p } = await crearPacienteConCuidador({
    dx, esProvincia: false, departamento: "Lima", edadAnios: 7,
  });
  const r = await crearRuta(p.id, dx, medicoId);

  await crearPaso(r.id, 1, "laboratorio", ubicaciones, {
    estado: "completado", completadoEn: daysFromNow(-14),
  });
  await crearPaso(r.id, 2, "consulta", ubicaciones, {
    estado: "completado", completadoEn: daysFromNow(-13),
  });
  await crearPaso(r.id, 3, "farmacia", ubicaciones, {
    estado: "completado", completadoEn: daysFromNow(-13),
  });
  await crearPaso(r.id, 4, "control", ubicaciones, {
    estado: "programado", programadoPara: daysFromNow(5), venceEn: daysFromNow(6),
  });

  return p;
}

async function sembrarCasoB(ubicaciones: { id: string; tipo: string }[], medicoId?: string) {
  // Caso B — Junín, consulta en 36h, hemograma pendiente. Dispara R5.
  const dx = DIAGNOSTICOS[1]; // LLA consolidación
  const { paciente: p } = await crearPacienteConCuidador({
    dx, esProvincia: true, departamento: "Junín", edadAnios: 5,
  });
  const r = await crearRuta(p.id, dx, medicoId);

  await crearPaso(r.id, 1, "farmacia", ubicaciones, {
    estado: "completado", completadoEn: daysFromNow(-20),
  });
  await crearPaso(r.id, 2, "laboratorio", ubicaciones, {
    estado: "en_curso", programadoPara: hoursFromNow(-2),
  });
  await crearPaso(r.id, 3, "consulta", ubicaciones, {
    estado: "notificado", programadoPara: hoursFromNow(36), venceEn: hoursFromNow(48),
  });

  await db.insert(resultadoLab).values({
    pacienteId: p.id,
    tipo: "Hemograma completo",
    solicitadoEn: hoursFromNow(-2),
    estado: "pendiente",
  });
  await registrarEvento("paciente", p.id, "resultado_solicitado", { ocurridoEn: hoursFromNow(-2) });

  return p;
}

async function sembrarCasoC(ubicaciones: { id: string; tipo: string }[], medicoId?: string) {
  // Caso C — Áncash, 31 días sin actividad. Dispara R1 (definición SIOP-PODC).
  const dx = DIAGNOSTICOS[0]; // LLA inducción
  const { paciente: p } = await crearPacienteConCuidador({
    dx, esProvincia: true, departamento: "Áncash", edadAnios: 4,
  });
  const r = await crearRuta(p.id, dx, medicoId);

  await crearPaso(r.id, 1, "laboratorio", ubicaciones, {
    estado: "completado", completadoEn: daysFromNow(-45),
  });
  await crearPaso(r.id, 2, "farmacia", ubicaciones, {
    estado: "completado", completadoEn: daysFromNow(-31),
  });
  // El siguiente paso quedó programado y nunca se cerró: aquí se corta la ruta.
  await crearPaso(r.id, 3, "control", ubicaciones, {
    estado: "vencido", programadoPara: daysFromNow(-24), venceEn: daysFromNow(-22),
  });

  return p;
}

async function sembrarCasoD(ubicaciones: { id: string; tipo: string }[], medicoId?: string) {
  // Caso D — Lima, 2 inasistencias consecutivas. Dispara R3.
  const dx = DIAGNOSTICOS[9]; // PTI seguimiento
  const { paciente: p } = await crearPacienteConCuidador({
    dx, esProvincia: false, departamento: "Lima", edadAnios: 9,
  });
  const r = await crearRuta(p.id, dx, medicoId);

  await crearPaso(r.id, 1, "consulta", ubicaciones, {
    estado: "completado", completadoEn: daysFromNow(-40),
  });
  await crearPaso(r.id, 2, "control", ubicaciones, {
    estado: "no_asistio", programadoPara: daysFromNow(-20),
  });
  await crearPaso(r.id, 3, "control", ubicaciones, {
    estado: "no_asistio", programadoPara: daysFromNow(-8),
  });

  return p;
}

// ---------------------------------------------------------------------------
// 20 pacientes de fondo — textura de sala real, sin guion
// ---------------------------------------------------------------------------

async function sembrarPacienteDeFondo(
  ubicaciones: { id: string; tipo: string }[],
  esProvincia: boolean,
  medicoId?: string,
  cuidadorExistente?: { id: string }
) {
  const dx = pick(DIAGNOSTICOS);
  const departamento = esProvincia ? pick(DEPARTAMENTOS_PROVINCIA) : "Lima";
  const { paciente: p, cuidadorId } = await crearPacienteConCuidador({
    dx, esProvincia, departamento, edadAnios: 1 + Math.floor(Math.random() * 15),
    cuidadorExistente,
  });
  const r = await crearRuta(p.id, dx, medicoId);

  const tiposPosibles: (typeof paso.$inferInsert)["tipo"][] = [
    "consulta", "laboratorio", "farmacia", "control", "imagen", "transfusion",
  ];
  const numPasos = 2 + Math.floor(Math.random() * 4);
  let cursorDias = -(20 + Math.floor(Math.random() * 60));

  for (let i = 0; i < numPasos; i++) {
    const tipo = pick(tiposPosibles);
    const esUltimo = i === numPasos - 1;
    cursorDias += 5 + Math.floor(Math.random() * 12);

    if (!esUltimo || Math.random() < 0.6) {
      await crearPaso(r.id, i + 1, tipo, ubicaciones, {
        estado: "completado",
        completadoEn: daysFromNow(Math.min(cursorDias, -1)),
      });
    } else if (Math.random() < 0.5) {
      await crearPaso(r.id, i + 1, tipo, ubicaciones, {
        estado: "vencido",
        programadoPara: daysFromNow(Math.min(cursorDias, -1)),
        venceEn: daysFromNow(Math.min(cursorDias + 2, 1)),
      });
    } else {
      await crearPaso(r.id, i + 1, tipo, ubicaciones, {
        estado: "programado",
        programadoPara: daysFromNow(Math.max(1, -cursorDias)),
        venceEn: daysFromNow(Math.max(2, -cursorDias + 1)),
      });
    }
  }

  return { paciente: p, cuidadorId };
}

// ---------------------------------------------------------------------------
// Orquestación
// ---------------------------------------------------------------------------

async function main() {
  console.log("Hematopass — sembrando datos sintéticos");
  await limpiar();

  const usuarios = await sembrarUsuarios();
  const medicoId = usuarios.find((u) => u.rol === "medico")?.id;
  const ubicaciones = await sembrarUbicaciones();

  console.log("  casos guionados (A, B, C, D)...");
  await sembrarCasoA(ubicaciones, medicoId);
  await sembrarCasoB(ubicaciones, medicoId);
  await sembrarCasoC(ubicaciones, medicoId);
  await sembrarCasoD(ubicaciones, medicoId);

  console.log("  20 pacientes de fondo...");
  // ~54% fuera de Lima en el total (13/24), igual que el hallazgo real del
  // INSNSB (Bloque 1 de investigación). Ya van 2 provincia + 2 Lima
  // guionados: faltan 11 provincia + 9 Lima entre los 20 de fondo.
  const distribucionProvincia = [
    ...Array(11).fill(true),
    ...Array(9).fill(false),
  ].sort(() => Math.random() - 0.5);

  // Dos parejas de hermanos comparten cuidador — "un teléfono, varios hijos".
  const primerHermano1 = await sembrarPacienteDeFondo(ubicaciones, distribucionProvincia[0], medicoId);
  const primerHermano2 = await sembrarPacienteDeFondo(ubicaciones, distribucionProvincia[1], medicoId);

  for (let i = 2; i < distribucionProvincia.length; i++) {
    const compartirCon =
      i === 2 ? primerHermano1 : i === 3 ? primerHermano2 : undefined;
    await sembrarPacienteDeFondo(
      ubicaciones,
      distribucionProvincia[i],
      medicoId,
      compartirCon ? { id: compartirCon.cuidadorId } : undefined
    );
  }

  const totalPacientes = await db.select().from(paciente);

  console.log(`\nListo. ${totalPacientes.length} pacientes sintéticos sembrados.`);
  console.log(`Credenciales de demo — contraseña: ${DEMO_PASSWORD}`);
  for (const u of usuarios) console.log(`  ${u.rol.padEnd(11)} ${u.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error sembrando datos:", err);
    process.exit(1);
  });
