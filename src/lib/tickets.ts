"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { validateCustomValues, type FieldDef } from "@/lib/fields";
import { diffMentions } from "@/lib/mentions";
import { sendEmail } from "@/lib/email";
import { KEEP_IMPORTED_NAME } from "@/lib/constants";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function nullableStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

/**
 * Interpret an assignee <select> value:
 *  - a real user id  -> assign that user, clear any imported fallback name
 *  - "" ("—")        -> unassign, clear the fallback name too
 *  - KEEP sentinel   -> keep the imported fallback name, no user assigned
 */
function parseAssignee(form: FormData, key: string): { userId: string | null; keepName: boolean } {
  const raw = nullableStr(form, key);
  if (raw === KEEP_IMPORTED_NAME) return { userId: null, keepName: true };
  return { userId: raw, keepName: false };
}

function parseLinks(form: FormData): { label: string; url: string }[] {
  const labels = form.getAll("linkLabel").map(String);
  const urls = form.getAll("linkUrl").map(String);
  const links: { label: string; url: string }[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = (urls[i] ?? "").trim();
    const label = (labels[i] ?? "").trim();
    if (url) links.push({ label: label || url, url });
  }
  return links;
}

async function buildCustomValues(form: FormData) {
  const defs = await db.fieldDefinition.findMany({ orderBy: { order: "asc" } });
  const fieldDefs: FieldDef[] = defs.map((d) => ({
    key: d.key,
    label: d.label,
    type: d.type,
    options: d.options,
    required: d.required,
  }));
  const input: Record<string, unknown> = {};
  for (const d of fieldDefs) {
    input[d.key] = d.type === "multiselect" ? form.getAll(`cf_${d.key}`) : form.get(`cf_${d.key}`);
  }
  return validateCustomValues(fieldDefs, input);
}

async function notify(
  ticketId: string,
  client: string,
  emails: string[],
  type: "MENTION" | "ASSIGNMENT",
) {
  for (const email of emails) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.active) continue;
    const verb = type === "MENTION" ? "mentioned on" : "assigned to";
    const ok = await sendEmail({
      to: user.email,
      subject: `You were ${verb} ${client}`,
      text: `You were ${verb} the wedding ticket "${client}".\n\nOpen it: ${process.env.AUTH_URL ?? "http://localhost:3000"}/tickets/${ticketId}`,
    });
    await db.notification.create({
      data: {
        ticketId,
        recipientUserId: user.id,
        type,
        emailedAt: ok ? new Date() : null,
      },
    });
  }
}

export async function createTicket(form: FormData) {
  await requireUser();

  const client = str(form, "client");
  if (!client) throw new Error("Client is required");

  const { values, errors } = await buildCustomValues(form);
  if (Object.keys(errors).length > 0) {
    throw new Error(`Validation failed: ${Object.values(errors).join("; ")}`);
  }

  const weddingDate = nullableStr(form, "weddingDate");
  const description = str(form, "description");
  const mc = parseAssignee(form, "mcUserId");
  const dj = parseAssignee(form, "djUserId");
  const ch = parseAssignee(form, "contractHandlerId");

  const ticket = await db.ticket.create({
    data: {
      client,
      weddingDate: weddingDate ? new Date(weddingDate) : null,
      location: nullableStr(form, "location"),
      description,
      customValues: values as Prisma.InputJsonObject,
      stageId: nullableStr(form, "stageId"),
      mcUserId: mc.userId,
      ...(mc.keepName ? {} : { mcName: null }),
      djUserId: dj.userId,
      ...(dj.keepName ? {} : { djName: null }),
      contractHandlerId: ch.userId,
      ...(ch.keepName ? {} : { contractHandlerName: null }),
      links: { create: parseLinks(form) },
    },
  });

  const users = await db.user.findMany({ where: { active: true }, select: { email: true } });
  const known = users.map((u) => u.email);
  await notify(ticket.id, client, diffMentions(null, description, known), "MENTION");

  const assignees = [mc.userId, dj.userId, ch.userId].filter(Boolean) as string[];
  const assigneeEmails = (
    await db.user.findMany({ where: { id: { in: assignees } }, select: { email: true } })
  ).map((u) => u.email);
  await notify(ticket.id, client, assigneeEmails, "ASSIGNMENT");

  revalidatePath("/");
  redirect(`/tickets/${ticket.id}`);
}

export async function updateTicket(id: string, form: FormData) {
  await requireUser();

  const existing = await db.ticket.findUnique({ where: { id } });
  if (!existing) throw new Error("Ticket not found");

  const client = str(form, "client");
  if (!client) throw new Error("Client is required");

  const { values, errors } = await buildCustomValues(form);
  if (Object.keys(errors).length > 0) {
    throw new Error(`Validation failed: ${Object.values(errors).join("; ")}`);
  }

  const weddingDate = nullableStr(form, "weddingDate");
  const description = str(form, "description");
  const mc = parseAssignee(form, "mcUserId");
  const dj = parseAssignee(form, "djUserId");
  const ch = parseAssignee(form, "contractHandlerId");

  await db.ticket.update({
    where: { id },
    data: {
      client,
      weddingDate: weddingDate ? new Date(weddingDate) : null,
      location: nullableStr(form, "location"),
      description,
      customValues: values as Prisma.InputJsonObject,
      stageId: nullableStr(form, "stageId"),
      // Picking a user (or "—") clears the imported fallback name; keeping the
      // imported option leaves the name untouched.
      mcUserId: mc.userId,
      ...(mc.keepName ? {} : { mcName: null }),
      djUserId: dj.userId,
      ...(dj.keepName ? {} : { djName: null }),
      contractHandlerId: ch.userId,
      ...(ch.keepName ? {} : { contractHandlerName: null }),
      links: { deleteMany: {}, create: parseLinks(form) },
    },
  });

  const users = await db.user.findMany({ where: { active: true }, select: { email: true } });
  const known = users.map((u) => u.email);
  await notify(id, client, diffMentions(existing.description, description, known), "MENTION");

  const newlyAssigned: string[] = [];
  if (mc.userId && mc.userId !== existing.mcUserId) newlyAssigned.push(mc.userId);
  if (dj.userId && dj.userId !== existing.djUserId) newlyAssigned.push(dj.userId);
  if (ch.userId && ch.userId !== existing.contractHandlerId)
    newlyAssigned.push(ch.userId);
  if (newlyAssigned.length) {
    const emails = (
      await db.user.findMany({ where: { id: { in: newlyAssigned } }, select: { email: true } })
    ).map((u) => u.email);
    await notify(id, client, emails, "ASSIGNMENT");
  }

  revalidatePath("/");
  revalidatePath(`/tickets/${id}`);
  redirect(`/tickets/${id}`);
}

// Used by the inline description editor on the ticket detail page. Saves just
// the description (and fires mention notifications) without touching the rest
// of the ticket, then stays on the same page.
export async function updateTicketDescription(id: string, form: FormData) {
  await requireUser();
  const existing = await db.ticket.findUnique({ where: { id } });
  if (!existing) throw new Error("Ticket not found");

  const description = str(form, "description");
  await db.ticket.update({ where: { id }, data: { description } });

  const users = await db.user.findMany({ where: { active: true }, select: { email: true } });
  const known = users.map((u) => u.email);
  await notify(id, existing.client, diffMentions(existing.description, description, known), "MENTION");

  revalidatePath(`/tickets/${id}`);
}

export async function deleteTicket(id: string) {
  await requireUser();
  await db.ticket.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}
