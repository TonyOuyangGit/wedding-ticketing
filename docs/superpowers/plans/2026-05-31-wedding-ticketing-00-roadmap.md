# Wedding Ticketing — Phase 1 Plan Roadmap

Reference spec: `docs/superpowers/specs/2026-05-31-wedding-ticketing-design.md`

Phase 1 is split into five sequential plans. Each produces working, testable
software on its own. Build them in order; generate each detailed plan (via the
`superpowers:writing-plans` skill) when you reach it.

| # | Plan | File | Status |
| - | ---- | ---- | ------ |
| 1 | Foundation | `2026-05-31-wedding-ticketing-01-foundation.md` | Written, ready to execute |
| 2 | Ticketing core | `2026-05-31-wedding-ticketing-02-ticketing-core.md` | To be written |
| 3 | Admin settings | `2026-05-31-wedding-ticketing-03-admin-settings.md` | To be written |
| 4 | Mentions & email | `2026-05-31-wedding-ticketing-04-notifications.md` | To be written |
| 5 | Deployment | `2026-05-31-wedding-ticketing-05-deployment.md` | To be written |

## Plan 1 — Foundation (written)
Next.js + TypeScript scaffold; local Postgres + Prisma; full Phase 1 schema and
initial migration; Google SSO restricted to an allowlist; Admin/Member role
helpers (tested); login page and protected app shell.

## Plan 2 — Ticketing core
- Ticket create / read / update / delete via server actions.
- Stage assignment (uses the Stage table; a default stage set is seeded).
- The spreadsheet-style dashboard: sortable/filterable table (by stage,
  assignee, date range), quick search, row → ticket detail.
- Ticket detail/edit page for system fields (client, weddingDate, MC, DJ, stage,
  description) and the ExternalLink list.
- Tests: ticket CRUD integration; dashboard filter/sort logic unit tests.

## Plan 3 — Admin settings
- Admin-only Users tab: allowlist add/remove, set role, activate/deactivate.
- Admin-only Fields tab: CRUD `FieldDefinition` (all 7 types + select options).
- Admin-only Stages tab: CRUD and reorder stages.
- Dynamic rendering of custom fields on the ticket form from FieldDefinition.
- Custom-field validation against FieldDefinition (required, type coercion,
  select-option membership) — TDD, this is the trickiest unit.
- `customValues` JSONB read/write wired into ticket create/update.

## Plan 4 — Mentions & email notifications
- Markdown description editor with `@mention` autocomplete from the allowlist.
- On ticket save, diff new mentions/assignments vs. the previous version — TDD.
- Transactional email send (e.g. Resend) for each newly mentioned/assigned user.
- Notification table logging to prevent duplicate sends.

## Plan 5 — Deployment
- Dockerfile (multi-stage, standalone Next.js output).
- Cloud Run service + Cloud SQL Postgres (smallest tier) + Cloud SQL connector.
- Secrets in GCP Secret Manager; `DATABASE_URL`, `AUTH_*` wired in.
- Prisma migrate deploy on release; one-step `gcloud run deploy` or Cloud Build
  trigger on push. Add the production Google OAuth redirect URI.
