export type SessionUser = {
  id?: string;
  email?: string | null;
  role?: string;
};

export function isAdmin(
  user: Pick<SessionUser, "role"> | null | undefined,
): boolean {
  return user?.role === "ADMIN";
}

export function assertAccess(
  user: SessionUser | null | undefined,
  opts: { admin?: boolean } = {},
): asserts user is SessionUser {
  if (!user) throw new Error("Unauthorized");
  if (opts.admin && !isAdmin(user)) throw new Error("Forbidden");
}
