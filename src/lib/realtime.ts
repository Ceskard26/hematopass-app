import "server-only";
import { sql } from "@/db";

/**
 * Tiempo real vía Postgres LISTEN/NOTIFY — sin WebSockets, sin infra
 * adicional, sin vendor (docs/arquitectura.md §3). `sql.listen`/`sql.notify`
 * son parte de la librería `postgres` que ya usamos para todo lo demás: la
 * primera llamada a `.listen()` abre UNA conexión dedicada de bajo costo
 * (max:1, sin idle timeout) que la librería reutiliza y multiplexa para
 * todos los canales — no hay que gestionar esa conexión a mano.
 *
 * Un canal por paciente: cada evento relevante para su ruta (el médico
 * genera un paso, el cuidador escanea un QR) notifica en
 * `hp_paciente_<uuid>`. Quien esté escuchando ese canal —el dashboard
 * clínico abierto en esa ficha, o el celular del cuidador— se entera al
 * instante.
 */

function canalPaciente(pacienteId: string) {
  return `hp_paciente_${pacienteId}`;
}

export async function notificarPaciente(pacienteId: string) {
  await sql.notify(canalPaciente(pacienteId), "");
}

export async function suscribirPaciente(pacienteId: string, onEvento: () => void) {
  return sql.listen(canalPaciente(pacienteId), onEvento);
}
