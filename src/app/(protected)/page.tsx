import Link from "next/link";
import { requireUser } from "@/lib/guards";
import {
  listTickets,
  listStages,
  listActiveUsers,
  listFieldDefinitions,
} from "@/lib/queries";
import { TicketRow } from "@/components/TicketRow";
import { DashboardFilters } from "@/components/DashboardFilters";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

function personName(
  user: { name: string | null; email: string } | null,
  fallbackName: string | null,
): string {
  if (user) return user.name ?? user.email;
  return fallbackName || "—";
}

function fmtCustom(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; assignee?: string; q?: string }>;
}) {
  await requireUser();
  const { stage = "", assignee = "", q = "" } = await searchParams;

  const [tickets, stages, users, fields] = await Promise.all([
    listTickets(),
    listStages(),
    listActiveUsers(),
    listFieldDefinitions(),
  ]);

  const query = q.trim().toLowerCase();
  const filtered = tickets.filter((t) => {
    if (stage && t.stageId !== stage) return false;
    if (assignee && t.mcUserId !== assignee && t.djUserId !== assignee) return false;
    if (query && !t.client.toLowerCase().includes(query)) return false;
    return true;
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h1>Weddings</h1>
        <Link className="btn primary" href="/tickets/new">
          + New Event
        </Link>
      </div>

      <DashboardFilters
        stages={stages}
        users={users}
        q={q}
        stage={stage}
        assignee={assignee}
      />

      <p className="muted" style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
        {filtered.length} of {tickets.length} weddings
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Stage</th>
              <th>MC</th>
              <th>DJ</th>
              <th>Location</th>
              {fields.map((f) => (
                <th key={f.id}>{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const cv = (t.customValues ?? {}) as Record<string, unknown>;
              return (
                <TicketRow key={t.id} href={`/tickets/${t.id}`}>
                  <td>{fmtDate(t.weddingDate)}</td>
                  <td style={{ fontWeight: 600 }}>{t.client}</td>
                  <td>
                    {t.stage ? (
                      <span
                        className="stage-pill"
                        style={{ background: t.stage.color ?? "#6b7280" }}
                      >
                        {t.stage.name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{personName(t.mc, t.mcName)}</td>
                  <td>{personName(t.dj, t.djName)}</td>
                  <td>{t.location || "—"}</td>
                  {fields.map((f) => (
                    <td key={f.id}>{fmtCustom(cv[f.key])}</td>
                  ))}
                </TicketRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5 + fields.length} className="muted">
                  No weddings match. <Link href="/tickets/new">Create one</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
