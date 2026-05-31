import { loadEnv } from "./load-env";

loadEnv();

const DEFAULT_STAGES = [
  { name: "Inquiry", order: 0, color: "#9ca3af" },
  { name: "Booked", order: 1, color: "#3b82f6" },
  { name: "Planning", order: 2, color: "#f59e0b" },
  { name: "Confirmed", order: 3, color: "#10b981" },
  { name: "Completed", order: 4, color: "#6b7280" },
];

async function main() {
  const { db } = await import("../src/lib/db");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "ot.ouyang@gmail.com")
    .toLowerCase()
    .trim();

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", active: true },
    create: { email: adminEmail, role: "ADMIN", active: true, name: "Admin" },
  });
  console.log(`Admin user ready: ${admin.email} (${admin.role})`);

  for (const stage of DEFAULT_STAGES) {
    await db.stage.upsert({
      where: { name: stage.name },
      update: { order: stage.order, color: stage.color },
      create: stage,
    });
  }
  const stageCount = await db.stage.count();
  console.log(`Stages ready: ${stageCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
