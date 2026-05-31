import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";

const devAuthEnabled =
  process.env.DEV_AUTH_ENABLED === "true" &&
  process.env.NODE_ENV !== "production";

const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

// Dev-only: passwordless login as any allowlisted user. Never enabled in prod.
if (devAuthEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev email login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase();
        if (!email) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    // Allowlist gate: only existing, active users may sign in.
    async signIn({ user, account }) {
      if (!user.email) return false;
      const dbUser = await db.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      if (!dbUser || !dbUser.active) return false;
      if (account?.provider === "google" && account.providerAccountId && !dbUser.googleId) {
        await db.user.update({
          where: { id: dbUser.id },
          data: {
            googleId: account.providerAccountId,
            name: user.name ?? dbUser.name,
          },
        });
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await db.user.findUnique({
          where: { email: session.user.email.toLowerCase() },
        });
        if (dbUser) {
          const u = session.user as typeof session.user & {
            id?: string;
            role?: string;
          };
          u.id = dbUser.id;
          u.role = dbUser.role;
        }
      }
      return session;
    },
  },
});
