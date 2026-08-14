"use client";

/**
 * Cola de escaneos pendientes en IndexedDB. Un Server Action no puede
 * ejecutarse sin red — no hay lógica de negocio offline en el cliente, a
 * propósito, la validación es responsabilidad exclusiva del servidor
 * (docs/arquitectura.md §7). Lo único que el cliente puede hacer sin señal
 * es GUARDAR la intención ("intenté escanear esto") y reintentarla cuando
 * vuelva la conexión.
 */

const DB_NAME = "hematopass-offline";
const STORE = "escaneos_pendientes";

export type EscaneoEncolado = { id: number; qrToken: string; creadoEn: number };

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function encolarEscaneo(qrToken: string): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ qrToken, creadoEn: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function obtenerCola(): Promise<EscaneoEncolado[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as EscaneoEncolado[]);
    req.onerror = () => reject(req.error);
  });
}

export async function eliminarDeCola(id: number): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
