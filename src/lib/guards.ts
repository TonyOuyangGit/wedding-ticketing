import { auth } from "@/lib/auth";
import { assertAccess, type SessionUser } from "@/lib/access";

// Server-side guards for use in server components and server actions.
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
