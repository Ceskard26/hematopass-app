import { redirect } from "next/navigation";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { QrScanner } from "@/components/qr-scanner";

export default async function EscanearPage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  return <QrScanner />;
}
