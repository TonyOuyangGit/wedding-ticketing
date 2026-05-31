# Wedding Ticketing — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js app with a Postgres/Prisma schema, Google SSO restricted to an allowlist, role-based access, and a protected app shell.

**Architecture:** A single Next.js (App Router) + TypeScript application. Prisma maps to a local Postgres database in development. Auth.js (NextAuth v5) provides Google OAuth; a server-side allowlist check (the User table) gates access, and a role helper distinguishes Admin from Member.

**Tech Stack:** Next.js (App Router), TypeScript, Prisma, PostgreSQL, Auth.js (NextAuth v5), Vitest for unit tests, Docker (local Postgres).

Reference spec: `docs/superpowers/specs/2026-05-31-wedding-ticketing-design.md`

---

## File Structure

- `package.json`, `tsconfig.json`, `next.config.ts` — project config
- `docker-compose.yml` — local Postgres for development
- `.env.example`, `.env.local` — environment variables (DB URL, Google OAuth, Auth secret)
- `prisma/schema.prisma` — full Phase 1 data model
- `src/lib/db.ts` — Prisma client singleton
- `src/lib/auth.ts` — Auth.js config (Google provider + allowlist callback)
- `src/lib/access.ts` — `requireUser()` / `requireAdmin()` server helpers + role checks
- `src/lib/access.test.ts` — unit tests for the access helpers
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler
- `src/app/layout.tsx` — root layout
- `src/app/(protected)/layout.tsx` — protected layout that enforces auth
- `src/app/(protected)/page.tsx` — placeholder dashboard ("Signed in as …")
- `src/app/login/page.tsx` — sign-in page
- `src/middleware.ts` — redirect unauthenticated users to /login

---

## Task 1: Scaffold the Next.js + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Scaffold with create-next-app**

Run (non-interactive, into the current repo which already has README/LICENSE/docs):

```bash
npx create-next-app@latest . --typescript --app --src-dir --eslint --no-tailwind --import-alias "@/*" --use-npm --no-turbopack
```

If it refuses because the directory is non-empty, scaffold in a temp dir and copy in:

```bash
npx create-next-app@latest /tmp/wt-scaffold --typescript --app --src-dir --eslint --no-tailwind --import-alias "@/*" --use-npm --no-turbopack
cp -R /tmp/wt-scaffold/. .
rm -rf /tmp/wt-scaffold
```

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev` then visit http://localhost:3000 (or `curl -sS http://localhost:3000 | head`).
Expected: the default Next.js page renders. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript app"
```

---

## Task 2: Local Postgres + Prisma client

**Files:**
- Create: `docker-compose.yml`, `.env.example`, `.env.local`, `prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Add docker-compose for Postgres**

Create `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: wt
      POSTGRES_PASSWORD: wt
      POSTGRES_DB: wedding_ticketing
    ports:
      - "5432:5432"
    volumes:
      - wt_pgdata:/var/lib/postgresql/data
volumes:
  wt_pgdata:
```

- [ ] **Step 2: Add environment files**

Create `.env.example`:

```
DATABASE_URL="postgresql://wt:wt@localhost:5432/wedding_ticketing?schema=public"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_URL="http://localhost:3000"
```

Create `.env.local` with the same keys; generate the secret with `openssl rand -base64 32`. Leave Google ID/secret blank for now (filled in Task 4).

- [ ] **Step 3: Install Prisma and init client**

Run:

```bash
npm install prisma @prisma/client
npm install -D tsx
npx prisma init --datasource-provider postgresql
```

(Keep the generated `prisma/schema.prisma`; we overwrite it in Task 3.)

- [ ] **Step 4: Create the Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5: Start the database**

Run: `docker compose up -d`
Expected: container `db` is running (`docker compose ps` shows healthy/up).

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example src/lib/db.ts prisma package.json package-lock.json
git commit -m "chore: add local Postgres and Prisma client"
```

Note: `.env.local` is gitignored by the Next.js scaffold — do not commit it.

---

## Task 3: Define and migrate the Phase 1 schema

**Files:**
- Modify: `prisma/schema.prisma` (replace generated contents)

- [ ] **Step 1: Write the schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MEMBER
}

enum FieldType {
  text
  number
  boolean
  select
  multiselect
  url
  date
}

enum NotificationType {
  MENTION
  ASSIGNMENT
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  googleId  String?  @unique
  role      Role     @default(MEMBER)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  mcTickets     Ticket[]       @relation("Mc")
  djTickets     Ticket[]       @relation("Dj")
  notifications Notification[]
}

model Stage {
  id      String   @id @default(cuid())
  name    String   @unique
  order   Int      @default(0)
  color   String?
  tickets Ticket[]
}

model FieldDefinition {
  id       String    @id @default(cuid())
  key      String    @unique
  label    String
  type     FieldType
  options  String[]  @default([])
  required Boolean   @default(false)
  order    Int       @default(0)
}

model Ticket {
  id           String   @id @default(cuid())
  client       String
  weddingDate  DateTime?
  description  String   @default("")
  customValues Json     @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  stageId String?
  stage   Stage?  @relation(fields: [stageId], references: [id])

  mcUserId String?
  mc       User?   @relation("Mc", fields: [mcUserId], references: [id])

  djUserId String?
  dj       User?   @relation("Dj", fields: [djUserId], references: [id])

  links         ExternalLink[]
  notifications Notification[]
}

model ExternalLink {
  id       String @id @default(cuid())
  ticketId String
  ticket   Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  label    String
  url      String
}

model Notification {
  id              String           @id @default(cuid())
  ticketId        String
  ticket          Ticket           @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  recipientUserId String
  recipient       User             @relation(fields: [recipientUserId], references: [id])
  type            NotificationType
  emailedAt       DateTime?
  createdAt       DateTime         @default(now())
}
```

- [ ] **Step 2: Create and apply the migration**

Run: `npx prisma migrate dev --name init`
Expected: migration created under `prisma/migrations/` and applied; "Your database is now in sync" message.

- [ ] **Step 3: Verify the client generated**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Phase 1 Prisma schema and initial migration"
```

---

## Task 4: Google SSO via Auth.js with allowlist

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Install Auth.js**

Run: `npm install next-auth@beta`

- [ ] **Step 2: Configure Auth.js with the allowlist callback**

Create `src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    // Allowlist gate: only existing, active users may sign in.
    async signIn({ user, account }) {
      if (!user.email) return false;
      const dbUser = await db.user.findUnique({ where: { email: user.email } });
      if (!dbUser || !dbUser.active) return false;
      if (account?.providerAccountId && !dbUser.googleId) {
        await db.user.update({
          where: { id: dbUser.id },
          data: { googleId: account.providerAccountId, name: user.name ?? dbUser.name },
        });
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await db.user.findUnique({ where: { email: session.user.email } });
        if (dbUser) {
          (session.user as { id?: string; role?: string }).id = dbUser.id;
          (session.user as { id?: string; role?: string }).role = dbUser.role;
        }
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
```

- [ ] **Step 3: Add the Auth.js route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Register Google OAuth credentials**

In Google Cloud Console → APIs & Services → Credentials, create an OAuth 2.0 Client ID (type: Web application). Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`. Copy the Client ID/Secret into `.env.local` (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).

Expected: `.env.local` now has non-empty Google credentials. (This step is manual; no commit.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts "src/app/api/auth/[...nextauth]/route.ts" package.json package-lock.json
git commit -m "feat: add Google SSO with allowlist via Auth.js"
```

---

## Task 5: Access helpers with role checks (TDD)

**Files:**
- Create: `src/lib/access.ts`, `src/lib/access.test.ts`
- Modify: `package.json` (test script), create `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/access.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isAdmin, assertAccess } from "@/lib/access";

describe("isAdmin", () => {
  it("returns true for ADMIN role", () => {
    expect(isAdmin({ role: "ADMIN" })).toBe(true);
  });
  it("returns false for MEMBER role", () => {
    expect(isAdmin({ role: "MEMBER" })).toBe(false);
  });
  it("returns false when role is missing", () => {
    expect(isAdmin({})).toBe(false);
  });
});

describe("assertAccess", () => {
  it("throws when no session user", () => {
    expect(() => assertAccess(null)).toThrow("Unauthorized");
  });
  it("throws when admin required but user is member", () => {
    expect(() => assertAccess({ role: "MEMBER" }, { admin: true })).toThrow("Forbidden");
  });
  it("passes when admin required and user is admin", () => {
    expect(() => assertAccess({ role: "ADMIN" }, { admin: true })).not.toThrow();
  });
  it("passes for any logged-in user when admin not required", () => {
    expect(() => assertAccess({ role: "MEMBER" })).not.toThrow();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `access.ts` does not export `isAdmin`/`assertAccess`.

- [ ] **Step 4: Implement the access helpers**

Create `src/lib/access.ts`:

```typescript
import { auth } from "@/lib/auth";

export type SessionUser = { id?: string; email?: string | null; role?: string };

export function isAdmin(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return user?.role === "ADMIN";
}

export function assertAccess(
  user: SessionUser | null | undefined,
  opts: { admin?: boolean } = {},
): asserts user is SessionUser {
  if (!user) throw new Error("Unauthorized");
  if (opts.admin && !isAdmin(user)) throw new Error("Forbidden");
}

// Server-side guards for use in server components / actions.
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  assertAccess(user);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  assertAccess(user, { admin: true });
  return user;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all 7 assertions green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/access.ts src/lib/access.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add role-based access helpers with tests"
```

---

## Task 6: Login page and protected app shell

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/(protected)/layout.tsx`, `src/app/(protected)/page.tsx`, `src/middleware.ts`
- Modify: `src/app/page.tsx` (redirect to protected home)

- [ ] **Step 1: Add the login page**

Create `src/app/login/page.tsx`:

```typescript
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button type="submit">Sign in with Google</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Add the protected layout**

Create `src/app/(protected)/layout.tsx`:

```typescript
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid #ddd" }}>
        <strong>Wedding Ticketing</strong>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <span style={{ marginRight: "0.75rem" }}>{session.user.email}</span>
          <button type="submit">Sign out</button>
        </form>
      </header>
      <main style={{ padding: "1rem" }}>{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Add the placeholder dashboard**

Create `src/app/(protected)/page.tsx`:

```typescript
import { requireUser } from "@/lib/access";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Signed in as {user.email} ({user.role}). Ticket dashboard arrives in Plan 2.</p>
    </div>
  );
}
```

- [ ] **Step 4: Replace the root page with a redirect**

Replace `src/app/page.tsx` with:

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/");
}
```

Note: the `(protected)` route group serves `/`, so the default home is the protected dashboard. Delete the scaffold's `src/app/page.module.css` import if present to avoid an unused-import lint error.

- [ ] **Step 5: Add middleware to guard routes**

Create `src/middleware.ts`:

```typescript
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Seed one admin user so you can log in**

Run (replace the email with your own Google account):

```bash
npx tsx -e "import {db} from './src/lib/db'; db.user.upsert({where:{email:'YOUR_EMAIL@gmail.com'},update:{role:'ADMIN',active:true},create:{email:'YOUR_EMAIL@gmail.com',role:'ADMIN',active:true}}).then(()=>{console.log('seeded');process.exit(0)})"
```

Expected: prints `seeded`.

- [ ] **Step 7: Manually verify the auth flow**

Run: `npm run dev`. Visit http://localhost:3000 → redirected to `/login` → "Sign in with Google" → after Google consent, redirected back to the dashboard showing "Signed in as YOUR_EMAIL (ADMIN)". Confirm a non-allowlisted Google account is rejected.

Expected: allowlisted user reaches the dashboard; others are denied.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(protected)" src/app/login src/app/page.tsx src/middleware.ts
git commit -m "feat: add login page and protected app shell"
```

---

## Self-Review (completed by plan author)

- **Spec coverage (foundation slice):** Google SSO + allowlist (Tasks 4, 6) ✓; Admin/Member roles (Tasks 3, 5) ✓; full Phase 1 data model incl. single-select MC/DJ, JSONB customValues, Stage, FieldDefinition, ExternalLink, Notification (Task 3) ✓; one-app/one-DB architecture ✓. Ticket CRUD, dashboard, admin settings UI, mentions/email, and deployment are intentionally deferred to Plans 2–5.
- **Placeholder scan:** none — every code/command step contains concrete content.
- **Type consistency:** `Role` values `ADMIN`/`MEMBER`, `isAdmin`/`assertAccess`/`requireUser`/`requireAdmin` signatures, and the `SessionUser` shape are consistent across Tasks 4–6.
