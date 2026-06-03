import { db } from "@/lib/db";
import { DEFAULT_CONTRACT_HANDLER_KEY } from "@/lib/constants";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

// The admin-chosen default contract handler user id, but only if it still
// points at an active user (so a deactivated/removed default doesn't get
// silently re-applied to new tickets).
export async function getDefaultContractHandlerId(): Promise<string | null> {
  const id = await getSetting(DEFAULT_CONTRACT_HANDLER_KEY);
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, select: { active: true } });
  return user?.active ? id : null;
}

export async function listStages() {
  return db.stage.findMany({ orderBy: { order: "asc" } });
}

/**
 * Auto-promote any past-dated ticket to the "Completed" stage. Idempotent —
 * tickets already on the Completed stage are skipped. Called from the
 * dashboard before listTickets so the displayed stage matches reality.
 *
 * Note: this overwrites whatever stage a past-dated ticket was on (e.g.
 * "Confirmed" → "Completed" once the wedding date passes). That matches the
 * user-visible intent: pre-event stages stop being meaningful once the event
 * has happened.
 */
export async function autoCompletePastTickets(): Promise<void> {
  const completed = await db.stage.findFirst({
    where: { name: { equals: "Completed", mode: "insensitive" } },
    select: { id: true },
  });
  if (!completed) return; // no Completed stage configured — leave stages alone
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  await db.ticket.updateMany({
    where: {
      weddingDate: { lt: todayStart },
      stageId: { not: completed.id },
    },
    data: { stageId: completed.id },
  });
}

export async function listActiveUsers() {
  return db.user.findMany({
    where: { active: true },
    orderBy: { email: "asc" },
  });
}

export async function listAllUsers() {
  return db.user.findMany({ orderBy: { email: "asc" } });
}

export async function listFieldDefinitions() {
  return db.fieldDefinition.findMany({ orderBy: { order: "asc" } });
}

export async function listTickets() {
  return db.ticket.findMany({
    orderBy: [{ weddingDate: "asc" }, { createdAt: "desc" }],
    include: {
      stage: true,
      mc: { select: { id: true, email: true, name: true } },
      dj: { select: { id: true, email: true, name: true } },
      contractHandler: { select: { id: true, email: true, name: true } },
    },
  });
}

export async function getTicket(id: string) {
  return db.ticket.findUnique({
    where: { id },
    include: {
      stage: true,
      mc: { select: { id: true, email: true, name: true } },
      dj: { select: { id: true, email: true, name: true } },
      contractHandler: { select: { id: true, email: true, name: true } },
      links: true,
    },
  });
}
