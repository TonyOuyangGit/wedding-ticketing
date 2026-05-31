"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import type { FieldType } from "@/lib/fields";
import { DEFAULT_CONTRACT_HANDLER_KEY } from "@/lib/constants";

const FIELD_TYPES: FieldType[] = [
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
  "url",
  "date",
];

function s(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

// ---- Users (the allowlist) ----

export async function upsertUser(form: FormData) {
  await requireAdmin();
  const email = s(form, "email").toLowerCase();
  if (!email) throw new Error("Email is required");
  const role = s(form, "role") === "ADMIN" ? "ADMIN" : "MEMBER";
  const active = form.get("active") != null;
  const name = s(form, "name") || null;

  await db.user.upsert({
    where: { email },
    update: { role, active, name },
    create: { email, role, active, name },
  });
  revalidatePath("/admin");
}

export async function deleteUser(id: string) {
  const admin = await requireAdmin();
  if (admin.id === id) throw new Error("You cannot remove yourself");
  await db.user.delete({ where: { id } });
  revalidatePath("/admin");
}

// ---- Default contract handler setting ----

export async function setDefaultContractHandler(form: FormData) {
  await requireAdmin();
  const userId = s(form, "userId");
  if (userId) {
    await db.setting.upsert({
      where: { key: DEFAULT_CONTRACT_HANDLER_KEY },
      update: { value: userId },
      create: { key: DEFAULT_CONTRACT_HANDLER_KEY, value: userId },
    });
  } else {
    // "—" clears the default.
    await db.setting.deleteMany({ where: { key: DEFAULT_CONTRACT_HANDLER_KEY } });
  }
  revalidatePath("/admin");
}

// ---- Stages ----

export async function createStage(form: FormData) {
  await requireAdmin();
  const name = s(form, "name");
  if (!name) throw new Error("Stage name is required");
  const count = await db.stage.count();
  await db.stage.create({
    data: { name, color: s(form, "color") || null, order: count },
  });
  revalidatePath("/admin");
}

export async function updateStage(id: string, form: FormData) {
  await requireAdmin();
  await db.stage.update({
    where: { id },
    data: {
      name: s(form, "name"),
      color: s(form, "color") || null,
      order: Number(s(form, "order")) || 0,
    },
  });
  revalidatePath("/admin");
}

export async function deleteStage(id: string) {
  await requireAdmin();
  await db.ticket.updateMany({ where: { stageId: id }, data: { stageId: null } });
  await db.stage.delete({ where: { id } });
  revalidatePath("/admin");
}

// ---- Custom field definitions ----

function slugifyKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createField(form: FormData) {
  await requireAdmin();
  const label = s(form, "label");
  if (!label) throw new Error("Label is required");
  const type = s(form, "type") as FieldType;
  if (!FIELD_TYPES.includes(type)) throw new Error("Invalid field type");

  const key = s(form, "key") ? slugifyKey(s(form, "key")) : slugifyKey(label);
  if (!key) throw new Error("Could not derive a field key");

  const options = s(form, "options")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const count = await db.fieldDefinition.count();

  await db.fieldDefinition.create({
    data: {
      key,
      label,
      type,
      options,
      required: form.get("required") != null,
      order: count,
    },
  });
  revalidatePath("/admin");
}

export async function updateField(id: string, form: FormData) {
  await requireAdmin();
  const type = s(form, "type") as FieldType;
  if (!FIELD_TYPES.includes(type)) throw new Error("Invalid field type");
  const options = s(form, "options")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  await db.fieldDefinition.update({
    where: { id },
    data: {
      label: s(form, "label"),
      type,
      options,
      required: form.get("required") != null,
      order: Number(s(form, "order")) || 0,
    },
  });
  revalidatePath("/admin");
}

export async function deleteField(id: string) {
  await requireAdmin();
  await db.fieldDefinition.delete({ where: { id } });
  revalidatePath("/admin");
}
