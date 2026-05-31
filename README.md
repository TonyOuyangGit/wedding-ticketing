# Wedding Ticketing

In-house ticketing system for managing wedding DJ/MC gigs — a lightweight
replacement for juggling Email, Google Docs, contracts, and spreadsheets.

Each wedding is a **ticket** with a client, date, MC/DJ assignment, stage,
admin-defined custom fields, external document links, and a markdown
description supporting `@email` mentions that trigger email notifications.

**Stack:** Next.js 16 (App Router) · React 19 · Prisma 7 · PostgreSQL 16 ·
Auth.js (NextAuth v5) · TypeScript.

---

## Prerequisites

- **Node.js** (installed via Homebrew: `brew install node`)
- **PostgreSQL 16** (`brew install postgresql@16 && brew services start postgresql@16`)

> The Homebrew toolchain lives outside the default PATH. If `node`/`psql`
> aren't found, prepend:
> ```bash
> export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
> ```

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Create the database role + database (one time)
createuser wt --createdb 2>/dev/null; \
  psql postgres -c "ALTER USER wt WITH PASSWORD 'wt';"; \
  createdb -O wt wedding_ticketing

# 3. Configure environment
cp .env.example .env.local
#   - set AUTH_SECRET:   openssl rand -base64 32
#   - leave AUTH_GOOGLE_* blank for now; DEV_AUTH_ENABLED="true" lets you log
#     in locally with just an allowlisted email (no Google needed)

# 4. Create the schema
npx prisma db push

# 5. Seed your admin user + default stages
#    (defaults to ot.ouyang@gmail.com; override with SEED_ADMIN_EMAIL)
npm run db:seed
```

## Run it locally

```bash
npm run dev
# open http://localhost:3000
```

You'll be redirected to `/login`. In dev mode, enter your seeded admin email
(e.g. `ot.ouyang@gmail.com`) — no password — and you're in.

## Loading your spreadsheet (test data)

Export your Google Sheet to CSV, drop it in the repo, and import:

```bash
cp ~/Downloads/your-export.csv sample-data.csv
npm run db:import          # or: npm run db:import -- path/to/file.csv
```

The importer fuzzy-matches columns (client/couple, date, MC, DJ — MC/DJ are
matched to existing users by name or email) and preserves every other column
as a markdown bullet list in the ticket description, so nothing is lost.

## Common tasks

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `npm run dev`      | Start the dev server                            |
| `npm run build`    | Production build + typecheck                    |
| `npm test`         | Run unit tests (Vitest)                         |
| `npm run db:seed`  | Seed admin user + default stages                |
| `npm run db:import`| Import tickets from a CSV                        |
| `npx prisma studio`| Browse/edit the database in a GUI               |

## Admin

Sign in as an ADMIN, then use the **Admin** link in the header to manage:

- **Users (allowlist)** — only listed, active users can sign in
- **Stages** — the pipeline columns (Inquiry → Booked → … → Completed)
- **Custom fields** — add typed fields (text/number/boolean/select/
  multiselect/url/date) that appear on every ticket and the dashboard

## Deploying to production

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full step-by-step runbook
(Vercel + Neon Postgres, environment variables, schema push, Google SSO, and
custom domain). The notes below are a quick reference for the auth/email pieces.

## Going live with Google SSO

1. In Google Cloud Console, create an OAuth 2.0 Client (Web application).
2. Authorized redirect URI: `https://YOUR_DOMAIN/api/auth/callback/google`
   (and `http://localhost:3000/api/auth/callback/google` for local testing).
3. Put the client ID/secret in `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
4. Set `DEV_AUTH_ENABLED=""` (or remove it) in production so the passwordless
   dev login is disabled.

Email notifications use [Resend](https://resend.com): set `RESEND_API_KEY` in
production. Without it, notification emails are logged to the console.
