import localFont from "next/font/local";

/**
 * Roboto Serif — voz titular. Documental, con peso institucional.
 * Licencia: Apache License 2.0. Ver /licenses/fonts/ROBOTO-SERIF-APACHE2.txt
 */
export const robotoSerif = localFont({
  src: [
    { path: "../fonts/roboto-serif-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/roboto-serif-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

/**
 * Lato — voz de interfaz. Humanista, legible en pantallas pequeñas y de gama baja.
 * Licencia: SIL Open Font License 1.1. Ver /licenses/fonts/LATO-OFL.txt
 */
export const lato = localFont({
  src: [
    { path: "../fonts/lato-300.woff2", weight: "300", style: "normal" },
    { path: "../fonts/lato-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/lato-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/lato-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});
