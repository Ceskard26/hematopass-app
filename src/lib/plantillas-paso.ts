import type { paso } from "@/db/schema";

/**
 * Sin dependencias de servidor a propósito: este módulo lo importa tanto
 * código de servidor (queries.ts, actions.ts) como un Client Component
 * (generar-paso-panel.tsx). Si import { paso } de "@/db/schema" arrastrara
 * algo más que tipos, "next build" fallaría al intentar meter `postgres`
 * (Node-only, usa `tls`/`net`) en el bundle del navegador — por eso el
 * import de arriba es `import type`, que se borra por completo al compilar.
 */
export type TipoPaso = (typeof paso.$inferInsert)["tipo"];

export const PLANTILLAS_PASO: Record<
  TipoPaso,
  { ubicacionTipo: string; tituloClinico: string; instruccionCuidador: string; etiqueta: string }
> = {
  consulta: {
    ubicacionTipo: "consultorio",
    tituloClinico: "Evaluación clínica de control",
    instruccionCuidador: "Pasa a tu consulta de control con el hematólogo.",
    etiqueta: "Consulta de control",
  },
  laboratorio: {
    ubicacionTipo: "laboratorio",
    tituloClinico: "Hemograma completo",
    instruccionCuidador: "Ve al Laboratorio a sacarte sangre para el hemograma.",
    etiqueta: "Laboratorio",
  },
  imagen: {
    ubicacionTipo: "imagenes",
    tituloClinico: "Radiografía de tórax",
    instruccionCuidador: "Pasa a Imágenes para tu radiografía.",
    etiqueta: "Imágenes",
  },
  farmacia: {
    ubicacionTipo: "farmacia",
    tituloClinico: "Dispensación de medicamento",
    instruccionCuidador: "Recoge tu medicina en Farmacia.",
    etiqueta: "Recoger medicina",
  },
  transfusion: {
    ubicacionTipo: "banco_sangre",
    tituloClinico: "Transfusión programada",
    instruccionCuidador: "Pasa al Banco de Sangre para tu transfusión programada.",
    etiqueta: "Transfusión",
  },
  tramite_sis: {
    ubicacionTipo: "caja_sis",
    tituloClinico: "Validación de cobertura SIS",
    instruccionCuidador: "Pasa por Caja SIS a validar tu seguro.",
    etiqueta: "Trámite SIS",
  },
  referencia: {
    ubicacionTipo: "referencias",
    tituloClinico: "Emisión de carta de referencia",
    instruccionCuidador: "Recoge tu carta de referencia en Referencias y Citas.",
    etiqueta: "Referencia",
  },
  control: {
    ubicacionTipo: "consultorio",
    tituloClinico: "Control clínico de rutina",
    instruccionCuidador: "Hoy es tu cita de control.",
    etiqueta: "Control de rutina",
  },
};
