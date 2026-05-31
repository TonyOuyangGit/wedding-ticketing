import { db } from "@/lib/db";

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
      links: true,
    },
  });
}
