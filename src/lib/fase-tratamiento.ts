/**
 * Etiquetas en español de `paciente.fase_tratamiento` (src/db/schema.ts) —
 * el dato existe en la base desde el diseño original pero no se mostraba en
 * ningún lugar de la app del cuidador. No se afirma un "orden" clínico ni
 * una "siguiente fase": diagnóstico→inducción→consolidación→mantenimiento→
 * seguimiento es la secuencia típica de LLA, pero transfusión_crónica y
 * profilaxis son protocolos continuos de otros diagnósticos (drepanocitosis,
 * hemofilia) sin una "siguiente fase" — inventar esa secuencia sería una
 * afirmación clínica que este proyecto no está en posición de hacer.
 */
export const FASE_LABEL: Record<string, string> = {
  diagnostico: "Diagnóstico",
  induccion: "Inducción",
  consolidacion: "Consolidación",
  mantenimiento: "Mantenimiento",
  seguimiento: "Seguimiento",
  transfusion_cronica: "Transfusión crónica",
  profilaxis: "Profilaxis",
};
