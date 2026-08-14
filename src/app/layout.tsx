import type { Metadata, Viewport } from "next";
import { robotoSerif, lato } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hematopass",
  description:
    "Ruta asistencial digital para hematología pediátrica: cada paso del tratamiento, sellado y trazable, para el equipo clínico y la familia.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2c3e2d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${robotoSerif.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
