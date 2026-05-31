import { requireUser } from "@/lib/guards";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        Signed in as {user.email} ({user.role}). The ticket dashboard arrives in
        Plan 2.
      </p>
    </div>
  );
}
