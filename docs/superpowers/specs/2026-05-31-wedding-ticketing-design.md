# Wedding Ticketing System — Design (Phase 1)

**Date:** 2026-05-31
**Status:** Approved (design); ready for implementation planning
**Author:** Brainstormed with Claude Code

## Background

A wedding DJ/MC company currently manages wedding logistics across Email, Google
Docs, contracts, and Google Sheets. This friction motivates an in-house
ticketing system — a "simple Jira" tailored to wedding gigs. Each wedding is a
ticket.

This document covers **Phase 1: the core ticketing system**. AI-assisted Gmail
extraction is explicitly deferred to **Phase 2** and will be designed separately
once the core is proven in real use.

## Locked Decisions

| Area | Decision |
| --- | --- |
| Phasing | Build core ticketing first; AI Gmail extraction is a later phase. |
| Stack | Next.js (App Router) + TypeScript, full-stack. |
| Database | PostgreSQL via Prisma ORM. |
| Auth | "Sign in with Google" (OAuth 2.0, free) via Auth.js + server-side allowlist. |
| Custom fields | Admin-configurable at runtime. |
| Status stages | Admin-configurable stages. |
| Roles | Two roles: Admin and Member. |
| Notifications | Email only (no in-app inbox in Phase 1). |
| MC / DJ fields | Single-select user fields (one MC, one DJ per ticket). |
| Scale | Small: <15 users, <200 weddings/year. |
| Deployment | GCP Cloud Run + Cloud SQL (Postgres). Budget ceiling $300/mo; est. $30–70/mo. |

## Architecture

A single Next.js application serves both the UI and the API (server actions /
route handlers), talking to one Postgres database through Prisma. Auth.js
handles Google OAuth; a server-side allowlist check gates every request. A
transactional email service sends notification emails. The whole app deploys as
one container on Cloud Run, backed by Cloud SQL Postgres.

```
Browser ──> Next.js (Cloud Run) ──> Prisma ──> Cloud SQL (Postgres)
                  │
                  ├─ Auth.js (Google OAuth + allowlist)
                  └─ Email service (mentions / assignments)
```

Design goal: one deployable unit, one database, minimal moving parts to maintain.

## Data Model

The core principle: **system fields are always-present, strongly-typed columns;
custom fields are admin-defined and stored flexibly in JSONB.** A
`FieldDefinition` table provides the schema/validation layer over the JSONB
values. At this scale, JSONB is simpler than an EAV table, fully queryable in
Postgres, and avoids a join-per-field.

### Entities

- **User** — `id`, `email`, `name`, `googleId`, `role` (`ADMIN` | `MEMBER`),
  `active`. This table *is* the allowlist: only listed, active users can log in.
- **Ticket** — the wedding. System columns: `id`, `client` (title),
  `weddingDate`, `mcUserId` (single-select → User), `djUserId` (single-select →
  User), `stageId` (→ Stage), `description` (markdown), `createdAt`,
  `updatedAt`. Plus `customValues` (JSONB) for admin-defined fields.
- **Stage** — admin-configurable status stages: `id`, `name`, `order`, `color`.
- **FieldDefinition** — admin-defined custom fields: `id`, `key`, `label`,
  `type` (`text` | `number` | `boolean` | `select` | `multiselect` | `url` |
  `date`), `options` (for select types), `required`, `order`. The app renders
  and validates ticket forms dynamically from these.
- **ExternalLink** — `id`, `ticketId`, `label`, `url`. A repeatable list per
  ticket for contract / rundown / music / drive links.
- **Notification** — `id`, `ticketId`, `recipientUserId`, `type` (`MENTION` |
  `ASSIGNMENT`), `emailedAt`. A lightweight log to prevent duplicate sends.

## Key Screens

1. **Dashboard** (landing page after login) — a spreadsheet-style table of all
   weddings: wedding date, client, stage, MC, DJ, contract-done, headcount,
   location, plus any admin-defined custom columns. Sortable, filterable (by
   stage, assignee, date range), with quick search. Clicking a row opens the
   ticket detail.
2. **Ticket detail / edit** — all system fields, dynamically-rendered custom
   fields, the external-links list, and a markdown description editor with
   `@mention` autocomplete sourced from the User allowlist. Stage is a dropdown.
3. **Admin settings** (Admin role only) — three tabs: **Users** (allowlist
   add/remove, set role), **Fields** (CRUD field definitions and dropdown
   options), **Stages** (CRUD and reorder).

## Mentions & Notifications

The description is markdown supporting `@mention`. On save, the server diffs the
new mentions and assignments against the previous version of the ticket. For
each newly-mentioned or newly-assigned user, it sends one email ("You were
mentioned on [Client] — [wedding date]" with a deep link) and records it in the
Notification table to avoid resending. No in-app inbox in Phase 1.

## Auth & Permissions

Sign in with Google → Auth.js verifies the Google identity → the server checks
the email exists in the User table with `active = true`. If not, access is
denied. The Admin role gates field/stage/user configuration, enforced
server-side (not merely hidden in the UI). Sessions use secure cookies.

## Testing Strategy

Test-driven development throughout.

- **Unit tests:** custom-field validation (against FieldDefinition) and the
  mention/assignment diffing logic — the two trickiest pieces.
- **Integration tests:** ticket CRUD and the auth/allowlist gate.

## Deployment

- Dockerfile → Cloud Run.
- Cloud SQL Postgres (smallest tier) via the Cloud SQL connector.
- Secrets in GCP Secret Manager.
- Prisma migrations run on deploy.
- One-step releases: `gcloud run deploy`, or a small Cloud Build trigger on git
  push.
- Estimated cost ~$30–70/mo, well under the $300 ceiling.

## Out of Scope (Phase 1)

- AI / Gmail extraction (Phase 2).
- In-app notification inbox.
- Finer-grained per-ticket edit permissions beyond Admin/Member.
- Multiple MCs or DJs per wedding.
