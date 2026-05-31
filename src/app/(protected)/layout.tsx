import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #ddd",
        }}
      >
        <strong>Wedding Ticketing</strong>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
        >
          <span>{session.user.email}</span>
          <button type="submit">Sign out</button>
        </form>
      </header>
      <main style={{ padding: "1rem" }}>{children}</main>
    </div>
  );
}
