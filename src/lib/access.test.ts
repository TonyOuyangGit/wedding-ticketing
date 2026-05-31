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
  it("returns false for null/undefined", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe("assertAccess", () => {
  it("throws when no session user", () => {
    expect(() => assertAccess(null)).toThrow("Unauthorized");
  });
  it("throws when admin required but user is member", () => {
    expect(() => assertAccess({ role: "MEMBER" }, { admin: true })).toThrow(
      "Forbidden",
    );
  });
  it("passes when admin required and user is admin", () => {
    expect(() =>
      assertAccess({ role: "ADMIN" }, { admin: true }),
    ).not.toThrow();
  });
  it("passes for any logged-in user when admin not required", () => {
    expect(() => assertAccess({ role: "MEMBER" })).not.toThrow();
  });
});
