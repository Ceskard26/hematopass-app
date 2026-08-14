import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuario } from "@/db/schema";

declare module "next-auth" {
  interface User {
    rol?: string;
  }

  interface Session {
    user: {
      id: string;
      rol: string;
    } & DefaultSession["user"];
  }
}

/**
 * Cuatro roles (docs/arquitectura.md §6):
 *  - medico:     dashboard clínico, genera pasos
 *  - gestor:     bandeja de riesgo, registra recontactos
 *  - ventanilla: valida escaneos QR en el punto físico
 *  - admin:      panel de impacto, gestión de usuarios
 *
 * Credentials provider deliberado: para el piloto/demo no hay necesidad de
 * un IdP externo. La migración documentada es a OIDC/Keycloak (ver
 * docs/arquitectura.md) sin tocar el resto de la app, porque Auth.js ya
 * habla el protocolo de sesión de forma independiente del provider.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/ingresar",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const [user] = await db
          .select()
          .from(usuario)
          .where(eq(usuario.email, email.toLowerCase().trim()))
          .limit(1);

        if (!user || !user.activo) return null;

        const valido = await compare(password, user.passwordHash);
        if (!valido) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // La ampliación de tipos de "next-auth/jwt" no se resuelve de forma
      // fiable con moduleResolution "bundler" en este setup; se tipa el
      // campo extra localmente en vez de perseguir la augmentation.
      const t = token as typeof token & { rol?: string; id?: string };
      if (user) {
        t.rol = user.rol;
        t.id = user.id;
      }
      return t;
    },
    session({ session, token }) {
      const t = token as typeof token & { rol?: string; id?: string };
      if (session.user) {
        session.user.id = t.id ?? "";
        session.user.rol = t.rol ?? "";
      }
      return session;
    },
  },
});
