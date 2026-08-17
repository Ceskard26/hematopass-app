import type { Idioma } from "@/lib/idioma-cuidador";

/**
 * Traducciones español↔quechua (variante Qusqu-Qullaw / sureño, alfabeto
 * oficial del Ministerio de Educación) para la interfaz fija del cuidador
 * — botones, encabezados, navegación. Cubre a propósito solo texto propio
 * de la app, NUNCA datos clínicos reales (nombre de ubicación, instrucción
 * del paso, nota médica): eso sigue en español, tal como lo escribió el
 * personal clínico — traducirlo automáticamente sería inventar contenido
 * clínico, no traducir la interfaz.
 *
 * Aviso honesto: son traducciones de buena fe, no revisadas por un
 * hablante nativo. Suficiente para una demo; antes de un uso público real
 * conviene que alguien de la comunidad quechuahablante las revise.
 */

const DICCIONARIO = {
  bienvenida_titulo: { es: "Bienvenido a Hematopass", qu: "Hematopass-man allin hamusqayki" },
  bienvenida_texto: {
    es: "Escribe el código de tu pasaporte y tu DNI. Las dos cosas confirman que eres tú, no solo quien tiene la tarjeta en la mano.",
    qu: "Pasaporteykip kudigunta DNI-ykitawan qillqay. Iskaynin qanpuni kasqaykita rikuchin.",
  },
  dni_label: { es: "Tu DNI", qu: "DNI-yki" },
  codigo_label: { es: "Código de tu pasaporte", qu: "Pasaporteykip kudigun" },
  ingresar: { es: "Ingresar", qu: "Yaykuy" },

  nav_ahora: { es: "Ahora", qu: "Kunan" },
  nav_mapa: { es: "Mapa", qu: "Ñan" },
  nav_escanear: { es: "Escanear", qu: "Qhaway" },

  mapa_de_la_ruta: { es: "Mapa de la ruta", qu: "Ñanpa mapan" },
  hola: { es: "Hola", qu: "Napaykullayki" },
  cuidando_a: { es: "Cuidando a", qu: "Qhawapayasqayki" },
  cambiar_hijo: { es: "Cambiar de hijo(a)", qu: "Wawata tikray" },
  en_vivo: { es: "En vivo", qu: "Kunan pacha" },

  estacion_actual: { es: "Estación actual", qu: "Kunan kasqan" },
  estamos_en: { es: "Estamos en:", qu: "Kaypin kachkayku:" },
  sigue_despues: { es: "Sigue después", qu: "Qatiqnin" },
  escanear_codigo: { es: "Escanear código", qu: "Kudigu qhaway" },
  compartir_whatsapp: { es: "Compartir avance por WhatsApp", qu: "WhatsApp-pi willay" },

  todo_al_dia_titulo: { es: "Todo al día", qu: "Llapan allin kachkan" },
  todo_al_dia_texto: {
    es: "No hay ningún paso pendiente ahora. Te avisamos apenas el equipo médico agregue el siguiente.",
    qu: "Manaraq imapas suyachkanchu kunanqa. Hampiq iñikuq huk thakita yapaqtinqa, willasqaykiku.",
  },

  familia_provincia: { es: "Familia de fuera de Lima", qu: "Lima-manta karu ayllu" },
  alojamiento_titulo: { es: "Alojamiento cerca del hospital", qu: "Unquy wasi qayllapi tiyana wasi" },
  ver_opciones: { es: "Ver opciones →", qu: "Rikuy imakunatapas →" },

  tu_ruta: { es: "Tu ruta", qu: "Ñanniyki" },
  resultados: { es: "Resultados", qu: "Hurqusqakuna" },
  fase_actual: { es: "Fase actual", qu: "Kunan pachan" },
  nivel: { es: "Nivel", qu: "Nivel" },
  sellos_de: { es: "sellos de", qu: "qillqasqakuna, tukuy" },
  activo: { es: "Activo", qu: "Kunan ruwasqa" },
  bloqueado: { es: "Bloqueado", qu: "Wisq'asqa" },
  ver_resumen_completo: { es: "Ver resumen completo", qu: "Llapanta rikuy" },

  en_proceso: { es: "En proceso", qu: "Ruwakuchkan" },
  listo: { es: "Listo", qu: "Tukusqa" },
  entregado: { es: "Entregado", qu: "Haywasqa" },

  mascota_toca: { es: "¡Vamos avanzando! Ahora toca:", qu: "¡Rinapuni! Kunanqa:" },
  mascota_completado: { es: "¡Completaste todos los pasos de tu ruta por ahora!", qu: "¡Llapan thakikunata tukuruchkanki kunanqa!" },
  mascota_sin_pasos: { es: "Todavía no tenemos pasos para tu ruta.", qu: "Manaraq thakikuna kanchu ñanniykipaq." },
  pendiente: { es: "Pendiente", qu: "Suyasqa" },
  todavia_no_hay_pasos: { es: "Todavía no hay pasos registrados.", qu: "Manaraq thakikuna qillqasqachu." },
} as const;

export type ClaveTexto = keyof typeof DICCIONARIO;

export function t(idioma: Idioma, clave: ClaveTexto): string {
  return DICCIONARIO[clave][idioma];
}
