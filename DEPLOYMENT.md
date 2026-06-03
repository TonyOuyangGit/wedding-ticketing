# Deploying XX Events (Vercel + Neon)

This is the end-to-end runbook to take the app from your laptop to a public URL.
We host the Next.js app on **Vercel** (built by the makers of Next.js, git-push
auto-deploys) and run **PostgreSQL on Neon** (serverless Postgres). Realistic
cost for your usage: **$0–20/month** (both have free tiers that comfortably fit
a small team).

> One-time setup is ~30–45 minutes. After that, deploying a change is just
> `git push`.

---

## Overview of what you'll do

1. Provision a production database on Neon → get two connection strings.
2. Push the schema to it and seed your admin user.
3. Create a Google OAuth client for your production domain.
4. Push the code to GitHub.
5. Import the project on Vercel, set environment variables, deploy.
6. (Optional) Add a custom domain + email sending.

---

## 1. Provision the database (Neon)

1. Sign up at <https://neon.tech> (free tier is fine) and create a **project**
   (pick a region close to your Vercel region, e.g. US East).
2. After it's created, open **Dashboard → Connect** and copy the connection
   string. Neon gives you a **pooled** connection (host contains `-pooler`) and
   a **direct** connection. You need both:
   - **Pooled** → used by the running app (`DATABASE_URL` on Vercel).
   - **Direct** (non-pooled) → used for one-off schema pushes/seeding.

   Both look like:
   ```
   postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
   ```
   The pooled one has `-pooler` in the hostname.

> Why two? Serverless functions open many short-lived connections; the pooled
> endpoint (PgBouncer) keeps you from exhausting Postgres connections. Schema
> changes (`prisma db push`) need a plain direct connection.

## 2. Create the schema + seed your admin user

Run these **from your laptop**, pointing at the **direct** Neon URL. This
creates all the tables and inserts your admin user + default stages.

```bash
# Use the DIRECT (non-pooled) Neon connection string here:
export DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"

npx prisma db push        # creates all tables in the Neon database
npm run db:seed           # seeds admin user (ot.ouyang@gmail.com) + stages
```

To seed a different admin email:
```bash
SEED_ADMIN_EMAIL="you@yourdomain.com" npm run db:seed
```

(Optional) import your spreadsheet into production the same way:
```bash
npm run db:import -- sample-data.csv
```

> Tip: unset `DATABASE_URL` afterward (or open a new terminal) so you don't keep
> pointing local commands at production: `unset DATABASE_URL`.

## 3. Create a Google OAuth client (production login)

In production the passwordless dev login is **off** — users sign in with Google.

1. Go to <https://console.cloud.google.com> → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
3. Under **Authorized redirect URIs**, add (you can edit these later once you
   know your final Vercel URL):
   - `https://YOUR-APP.vercel.app/api/auth/callback/google`
   - `https://YOUR-CUSTOM-DOMAIN/api/auth/callback/google` (if you add one)
   - `http://localhost:3000/api/auth/callback/google` (for local testing)
4. Copy the **Client ID** and **Client secret** — you'll paste them into Vercel.

> Only emails on your Admin allowlist can actually get in, even though anyone
> can attempt Google sign-in. Make sure each real user's email exists (and is
> active) under **Admin → Users**.

## 4. Push the code to GitHub

Your remote is already `github.com/TonyOuyangGit/wedding-ticketing`.

```bash
git add -A
git commit -m "Prepare app for production deployment"
git push origin main
```

## 5. Deploy on Vercel

1. Sign in at <https://vercel.com> with GitHub.
2. **Add New… → Project**, import `wedding-ticketing`.
3. Vercel auto-detects Next.js — leave the build settings as default (our
   `build` script already runs `prisma generate && next build`).
4. **Before clicking Deploy**, expand **Environment Variables** and add the
   following (see the table below). At minimum you need `DATABASE_URL`,
   `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
5. Click **Deploy**. First build takes a couple of minutes.
6. When it's live, note the URL (e.g. `https://wedding-ticketing.vercel.app`).
   - If you guessed the URL wrong earlier, update `AUTH_URL` to the real URL and
     add the matching Google redirect URI, then redeploy.

### Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable             | Value                                                            | Required |
| -------------------- | ---------------------------------------------------------------- | -------- |
| `DATABASE_URL`       | Neon **pooled** connection string (`...-pooler...?sslmode=require`) | ✅ |
| `AUTH_SECRET`        | Generate with `openssl rand -base64 32`                          | ✅ |
| `AUTH_URL`           | Your public URL, e.g. `https://wedding-ticketing.vercel.app`     | ✅ |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID                                           | ✅ |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret                                       | ✅ |
| `RESEND_API_KEY`     | Resend API key (enables real notification emails)                | optional |
| `DEV_AUTH_ENABLED`   | **Do NOT set** in production (passwordless login stays disabled) | — |

> `AUTH_URL` does double duty: Auth.js uses it for OAuth callbacks, and the
> mention/assignment notification emails use it to build links back to a ticket.
> Set it to your real public URL.

## 6. (Optional) Custom domain + email

- **Custom domain:** Vercel → Project → **Settings → Domains** → add your domain
  and follow the DNS instructions. Then update `AUTH_URL` to the custom domain
  and add the matching Google redirect URI.
- **Google Maps location autocomplete:** turn on address suggestions on the
  Location field.
  1. Google Cloud Console → **APIs & Services → Library** → enable **Places API**.
  2. **APIs & Services → Credentials → Create credentials → API key**.
  3. Edit the new key → **Application restrictions → HTTP referrers** → add
     `https://YOUR-DOMAIN/*` (and `http://localhost:3000/*` for local testing).
  4. Under **API restrictions**, restrict to **Places API** only.
  5. In Vercel, set env var `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to the key value.
     Redeploy.

  Cost: ~$0.017 per autocomplete session. Google's $200/month free credit covers
  ~10,000 sessions — far beyond any wedding-event volume.

  If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset, the Location field falls back
  to a plain text input (no crash).

- **Email notifications:** sign up at <https://resend.com>, verify a sending
  domain, create an API key, and set `RESEND_API_KEY` in Vercel. Without it,
  notification emails are logged to the Vercel function logs instead of sent.

---

## Day-2: shipping changes

```bash
git add -A
git commit -m "your change"
git push origin main      # Vercel auto-builds & deploys main
```

Pull requests get their own preview URLs automatically.

### When you change the database schema

`prisma/schema.prisma` edits don't apply themselves in production. After merging
a schema change, push it to the prod DB from your laptop using the **direct**
Neon URL:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"  # direct
npx prisma db push
unset DATABASE_URL
```

> This app uses `prisma db push` (no migration history), which is fine for a
> single small database. If the team grows and you want versioned, reviewable
> migrations, switch to `prisma migrate`.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| ------- | ------------------ |
| Build fails on `@prisma/client` not generated | Ensure `build` is `prisma generate && next build` (already set). |
| `Can't reach database` / connection limit errors | App must use the **pooled** Neon URL in `DATABASE_URL`. |
| Login redirect loops / "callback URL mismatch" | `AUTH_URL` must match the real domain, and the Google redirect URI must be exactly `https://<domain>/api/auth/callback/google`. |
| Signed in with Google but get bounced out | That email isn't on the allowlist or is inactive — add it under **Admin → Users**. |
| Emails not arriving | `RESEND_API_KEY` not set, or sending domain not verified in Resend. |
| Schema change not reflected in prod | Run `prisma db push` against the direct Neon URL (see above). |
