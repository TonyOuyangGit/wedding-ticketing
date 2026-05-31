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
