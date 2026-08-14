import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __hematopassSql: ReturnType<typeof postgres> | undefined;
}

/**
 * Cliente único reutilizado entre hot-reloads en dev. En producción cada
 * instancia del contenedor mantiene su propia conexión — sin pooler externo,
 * deliberadamente: es la misma app la que correría on-premise en el INSNSB.
 */
const client =
  global.__hematopassSql ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    onnotice: () => {}, // silencia NOTICE de LISTEN/NOTIFY en logs de query normales
  });

if (process.env.NODE_ENV !== "production") {
  global.__hematopassSql = client;
}

export const db = drizzle(client, { schema });
export { client as sql };
