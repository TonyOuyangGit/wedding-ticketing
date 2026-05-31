import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { isAdmin, type SessionUser } from "@/lib/access";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  return (
    <div>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.6rem 1rem",
          borderBottom: "1px solid var(--border)",
          gap: "1rem",
        }}
      >
        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ fontWeight: 700, color: "var(--fg)" }}>
            XX Events
          </Link>
          <Link href="/tickets/new">New Event</Link>
          {isAdmin(user) && <Link href="/admin">Admin</Link>}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
        >
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {user.email}
          </span>
          <button type="submit">Sign out</button>
        </form>
      </header>
      <main style={{ padding: "1rem", maxWidth: 1200, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
