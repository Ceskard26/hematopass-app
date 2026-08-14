import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-sm tracking-[0.2em] uppercase text-text-muted mb-3">
          Instituto Nacional de Salud del Niño — San Borja
        </p>
        <h1 className="font-serif text-xxl mb-4">Hematopass</h1>
        <p className="text-md text-text-muted mb-10 leading-relaxed">
          Cada paso del tratamiento, sellado y visible para el equipo clínico
          y la familia. Datos sintéticos — prototipo de hackatón.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/ingresar"
            className="rounded-md bg-primary text-primary-ink px-6 py-3 font-semibold transition-colors hover:opacity-90"
          >
            Ingresar como personal clínico
          </Link>
          <Link
            href="/cuidador"
            className="rounded-md border border-border px-6 py-3 font-semibold transition-colors hover:bg-surface-2"
          >
            Soy familia de un paciente
          </Link>
        </div>
      </div>
    </main>
  );
}
