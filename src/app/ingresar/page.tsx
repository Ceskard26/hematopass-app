import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

async function ingresar(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/clinico");

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/ingresar?error=credenciales&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

export default async function IngresarPage(props: PageProps<"/ingresar">) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const callbackUrl =
    typeof searchParams.callbackUrl === "string" ? searchParams.callbackUrl : "/clinico";

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <form action={ingresar} className="hp-in w-full max-w-sm">
        <img
          src="/brand-mark.png"
          alt=""
          aria-hidden="true"
          width={48}
          height={48}
          className="hp-in-pop h-12 w-12 rounded-full mb-4"
        />
        <h1 className="font-serif text-xl mb-1">Personal clínico</h1>
        <p className="text-sm text-text-muted mb-6">
          Acceso para médicos, gestores de caso y ventanilla.
        </p>

        {error && (
          <p className="hp-in-fast mb-4 rounded-md bg-status-vencido/10 border border-status-vencido/30 text-status-vencido text-sm px-3 py-2">
            Correo o contraseña incorrectos.
          </p>
        )}

        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <label className="block text-sm font-medium mb-1" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 mb-4 outline-none transition-shadow focus:ring-2 focus:ring-primary"
        />

        <label className="block text-sm font-medium mb-1" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 mb-6 outline-none transition-shadow focus:ring-2 focus:ring-primary"
        />

        <button
          type="submit"
          className="hp-press w-full rounded-md bg-primary text-primary-ink py-2.5 font-semibold hover:opacity-90"
        >
          Ingresar
        </button>
      </form>
    </main>
  );
}
