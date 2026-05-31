import { signIn } from "@/lib/auth";

export default function LoginPage() {
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const devEnabled =
    process.env.DEV_AUTH_ENABLED === "true" &&
    process.env.NODE_ENV !== "production";

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      <div style={{ display: "grid", gap: "1.5rem", minWidth: 280 }}>
        <h1 style={{ textAlign: "center" }}>Wedding Ticketing</h1>

        {googleEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button type="submit" style={{ width: "100%", padding: "0.6rem" }}>
              Sign in with Google
            </button>
          </form>
        )}

        {devEnabled && (
          <form
            action={async (formData: FormData) => {
              "use server";
              const email = String(formData.get("email") ?? "");
              await signIn("dev", { email, redirectTo: "/" });
            }}
            style={{ display: "grid", gap: "0.5rem" }}
          >
            <label style={{ fontSize: "0.85rem", color: "#666" }}>
              Dev login (allowlisted email, no password)
            </label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              style={{ padding: "0.5rem" }}
            />
            <button type="submit" style={{ padding: "0.6rem" }}>
              Dev sign in
            </button>
          </form>
        )}

        {!googleEnabled && !devEnabled && (
          <p style={{ color: "#b00" }}>
            No sign-in method configured. Set Google OAuth credentials or enable
            DEV_AUTH_ENABLED in your environment.
          </p>
        )}
      </div>
    </main>
  );
}
