import { describe, it, expect } from "vitest";
import { parseMentions, diffMentions } from "@/lib/mentions";

const known = ["mc@x.com", "dj@x.com", "boss@x.com"];

describe("parseMentions", () => {
  it("extracts known emails after @", () => {
    expect(
      parseMentions("Hey @mc@x.com and @dj@x.com please review", known).sort(),
    ).toEqual(["dj@x.com", "mc@x.com"]);
  });

  it("ignores emails not in the allowlist", () => {
    expect(parseMentions("@stranger@y.com check this", known)).toEqual([]);
  });

  it("dedupes repeated mentions", () => {
    expect(parseMentions("@mc@x.com @mc@x.com", known)).toEqual(["mc@x.com"]);
  });

  it("is case-insensitive on the email", () => {
    expect(parseMentions("@MC@X.com hi", known)).toEqual(["mc@x.com"]);
  });
});

describe("diffMentions", () => {
  it("returns only newly added mentions", () => {
    const oldText = "@mc@x.com first note";
    const newText = "@mc@x.com first note, also @dj@x.com";
    expect(diffMentions(oldText, newText, known)).toEqual(["dj@x.com"]);
  });

  it("returns empty when nothing new is mentioned", () => {
    expect(diffMentions("@mc@x.com", "@mc@x.com again", known)).toEqual([]);
  });

  it("treats null previous text as all-new", () => {
    expect(diffMentions(null, "@boss@x.com", known)).toEqual(["boss@x.com"]);
  });
});
