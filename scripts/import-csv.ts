/**
 * Flexible CSV importer for seeding test tickets.
 *
 * Usage:  npm run db:import -- [path/to/file.csv]
 * Default path: ./sample-data.csv
 *
 * Maps columns by fuzzy header matching:
 *   - client  <- "client" | "couple" | "name" | "wedding"
 *   - date    <- "date"
 *   - mc      <- "mc" | "host" | "emcee"   (matched to a user by name/email)
 *   - dj      <- "dj"                       (matched to a user by name/email)
 * Every other column is appended to the description as a markdown bullet list,
 * so nothing from the sheet is lost.
 */
import { loadEnv } from "./load-env";

loadEnv();

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function findCol(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (patterns.some((p) => p.test(h))) return i;
  }
  return -1;
}

function parseDate(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  // Sheet uses MM-DD-YY (e.g. 01-02-26). Also accept slashes and 4-digit years.
  const m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    // Use UTC midnight so the calendar date doesn't shift across timezones.
    const d = new Date(Date.UTC(year, month - 1, day));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const { db } = await import("../src/lib/db");
  const path = process.argv[2] ?? "sample-data.csv";

  const fs = await import("node:fs/promises");
  let text: string;
  try {
    text = await fs.readFile(path, "utf8");
  } catch {
    console.error(`Could not read CSV at "${path}".`);
    console.error("Copy your sheet export into the repo, e.g.:");
    console.error("  cp ~/Downloads/your-export.csv sample-data.csv");
    process.exit(1);
  }

  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }

  const headers = rows[0].map((h) => h.trim());
  const idxClient = findCol(headers, [/client/, /couple/, /\bname\b/, /wedding/, /bride|groom/]);
  const idxDate = findCol(headers, [/date/]);
  const idxMc = findCol(headers, [/\bmc\b/, /emcee/, /\bhost\b/]);
  const idxDj = findCol(headers, [/\bdj\b/]);
  const idxLocation = findCol(headers, [/location/, /venue/, /address/]);

  console.log("Detected columns:");
  console.log(`  client   -> ${idxClient >= 0 ? headers[idxClient] : "(none, using row #)"}`);
  console.log(`  date     -> ${idxDate >= 0 ? headers[idxDate] : "(none)"}`);
  console.log(`  mc       -> ${idxMc >= 0 ? headers[idxMc] : "(none)"}`);
  console.log(`  dj       -> ${idxDj >= 0 ? headers[idxDj] : "(none)"}`);
  console.log(`  location -> ${idxLocation >= 0 ? headers[idxLocation] : "(none)"}`);

  // Normalize: lowercase, trim, collapse internal whitespace.
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

  const users = await db.user.findMany({ select: { id: true, name: true, email: true } });
  const userByKey = new Map<string, string>();
  for (const u of users) {
    userByKey.set(norm(u.email), u.id);
    userByKey.set(norm(u.email.split("@")[0]), u.id); // email local-part
    if (u.name) userByKey.set(norm(u.name), u.id);
  }
  const matchUser = (val: string): string | null => userByKey.get(norm(val)) ?? null;

  // Imported events get the admin-chosen default contract handler (if set and
  // still active), mirroring the new-event form behavior.
  const { DEFAULT_CONTRACT_HANDLER_KEY } = await import("../src/lib/constants");
  const setting = await db.setting.findUnique({
    where: { key: DEFAULT_CONTRACT_HANDLER_KEY },
  });
  const defaultHandlerId =
    setting?.value && users.some((u) => u.id === setting.value) ? setting.value : null;
  if (defaultHandlerId) console.log(`  contract -> default handler ${defaultHandlerId}`);

  // Values that aren't real names — don't store them as fallback display names.
  const JUNK = new Set(["", "n/a", "na", "n.a", "n.a.", "tbd", "none", "-", "—", "x", "xx"]);
  const isJunkName = (val: string) => JUNK.has(norm(val));

  let created = 0;
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const client =
      (idxClient >= 0 ? cells[idxClient]?.trim() : "") || `Imported row ${r}`;
    const weddingDate = idxDate >= 0 ? parseDate(cells[idxDate] ?? "") : null;
    const location = idxLocation >= 0 ? (cells[idxLocation] ?? "").trim() || null : null;

    const mcRaw = idxMc >= 0 ? (cells[idxMc] ?? "").trim() : "";
    const djRaw = idxDj >= 0 ? (cells[idxDj] ?? "").trim() : "";
    const mcUserId = matchUser(mcRaw);
    const djUserId = matchUser(djRaw);
    // Unmatched, non-junk names are kept as a fallback display name on the
    // ticket so the admin can later create the user and reassign.
    const mcName = !mcUserId && !isJunkName(mcRaw) ? mcRaw : null;
    const djName = !djUserId && !isJunkName(djRaw) ? djRaw : null;

    // These columns are captured in dedicated fields; everything else gets
    // preserved as a markdown bullet list in the description.
    const usedIdx = new Set([idxClient, idxDate, idxMc, idxDj, idxLocation]);
    const extras = headers
      .map((h, i) => ({ h, v: (cells[i] ?? "").trim(), i }))
      .filter((x) => !usedIdx.has(x.i) && x.v !== "")
      .map((x) => `- **${x.h}:** ${x.v}`);
    const description = extras.length
      ? `Imported from CSV.\n\n${extras.join("\n")}`
      : "Imported from CSV.";

    await db.ticket.create({
      data: {
        client,
        weddingDate,
        location,
        description,
        mcUserId,
        mcName,
        djUserId,
        djName,
        contractHandlerId: defaultHandlerId,
      },
    });
    created++;
  }

  console.log(`\nImported ${created} tickets.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
