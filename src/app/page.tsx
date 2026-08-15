import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex-1 flex items-center justify-center px-6 overflow-hidden">
      <img
        src="/brand-badge-xl.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[130vw] max-w-[1100px] sm:w-[85vw] opacity-[0.12] mix-blend-multiply"
      />
      <div className="relative max-w-xl text-center">
        <p
          className="hp-in text-sm tracking-[0.2em] uppercase text-text-muted mb-3"
          style={{ animationDelay: "0ms" }}
        >
          Instituto Nacional de Salud del Niño — San Borja
        </p>
        <h1 className="hp-in font-serif text-xxl mb-4" style={{ animationDelay: "60ms" }}>
          Hematopass
        </h1>
        <p className="hp-in text-md text-text-muted mb-10 leading-relaxed" style={{ animationDelay: "120ms" }}>
          Cada paso del tratamiento, sellado y visible para el equipo clínico
          y la familia. Datos sintéticos — prototipo de hackatón.
        </p>
        <div
          className="hp-in flex flex-col sm:flex-row gap-4 justify-center"
          style={{ animationDelay: "190ms" }}
        >
          <Link
            href="/ingresar"
            className="hp-press rounded-md bg-primary text-primary-ink px-6 py-3 font-semibold hover:opacity-90"
          >
            Ingresar como personal clínico
          </Link>
          <Link
            href="/cuidador"
            className="hp-press rounded-md border border-border px-6 py-3 font-semibold hover:bg-surface-2"
          >
            Soy familia de un paciente
          </Link>
        </div>
      </div>
    </main>
  );
}
