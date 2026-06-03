import Link from "next/link";
import type { FieldDefinition } from "@prisma/client";
import { requireUser } from "@/lib/guards";
import {
  listTickets,
  listStages,
  listActiveUsers,
  listFieldDefinitions,
  autoCompletePastTickets,
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

// Tickets are stored with UTC-midnight calendar dates (the importer/parser
// uses Date.UTC), so compare against today's UTC midnight to avoid timezone
// drift around the day boundary.
function todayStartUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

type TicketRowData = Awaited<ReturnType<typeof listTickets>>[number];

function TicketsTable({
  rows,
  fields,
  emptyMessage,
}: {
  rows: TicketRowData[];
  fields: FieldDefinition[];
  emptyMessage: React.ReactNode;
}) {
  return (
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
          {rows.map((t) => {
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
          {rows.length === 0 && (
            <tr>
              <td colSpan={5 + fields.length} className="muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; assignee?: string; q?: string }>;
}) {
  await requireUser();
  const { stage = "", assignee = "", q = "" } = await searchParams;

  // Promote past-dated tickets to the "Completed" stage before reading them,
  // so the displayed stage reflects what they should be.
  await autoCompletePastTickets();

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

  // Split into Upcoming (today onward + undated) vs Completed (past dates).
  // The Stage field stays untouched — past-ness is just a date check.
  const cutoff = todayStartUtc();
  const upcoming = filtered
    .filter((t) => !t.weddingDate || t.weddingDate.getTime() >= cutoff)
    .sort((a, b) => {
      if (!a.weddingDate && !b.weddingDate) return 0;
      if (!a.weddingDate) return -1; // no-date items surface first (need scheduling)
      if (!b.weddingDate) return 1;
      return a.weddingDate.getTime() - b.weddingDate.getTime();
    });
  const completed = filtered
    .filter((t) => t.weddingDate && t.weddingDate.getTime() < cutoff)
    .sort((a, b) => b.weddingDate!.getTime() - a.weddingDate!.getTime());

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

      <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
        {filtered.length} of {tickets.length} weddings · {upcoming.length} upcoming
        · {completed.length} completed
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>
          Upcoming{" "}
          <span className="muted" style={{ fontWeight: 400, fontSize: "0.9rem" }}>
            ({upcoming.length})
          </span>
        </h2>
        <TicketsTable
          rows={upcoming}
          fields={fields}
          emptyMessage={
            <>
              No upcoming events. <Link href="/tickets/new">Create one</Link>.
            </>
          }
        />
      </section>

      {completed.length > 0 && (
        <details>
          <summary
            style={{
              cursor: "pointer",
              padding: "0.4rem 0",
              fontWeight: 600,
              fontSize: "1.1rem",
            }}
          >
            Completed{" "}
            <span className="muted" style={{ fontWeight: 400, fontSize: "0.9rem" }}>
              ({completed.length})
            </span>
          </summary>
          <div style={{ marginTop: "0.5rem" }}>
            <TicketsTable
              rows={completed}
              fields={fields}
              emptyMessage="No completed events yet."
            />
          </div>
        </details>
      )}
    </div>
  );
}
