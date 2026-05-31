import { describe, it, expect } from "vitest";
import { coerceFieldValue, validateCustomValues, type FieldDef } from "@/lib/fields";

const def = (over: Partial<FieldDef>): FieldDef => ({
  key: "f",
  label: "F",
  type: "text",
  options: [],
  required: false,
  ...over,
});

describe("coerceFieldValue", () => {
  it("trims text", () => {
    expect(coerceFieldValue(def({ type: "text" }), "  hi ")).toEqual({ value: "hi" });
  });

  it("parses numbers and rejects non-numeric", () => {
    expect(coerceFieldValue(def({ type: "number" }), "42")).toEqual({ value: 42 });
    expect(coerceFieldValue(def({ type: "number" }), "abc").error).toMatch(/number/i);
  });

  it("coerces booleans from checkbox values", () => {
    expect(coerceFieldValue(def({ type: "boolean" }), "on")).toEqual({ value: true });
    expect(coerceFieldValue(def({ type: "boolean" }), undefined)).toEqual({ value: false });
  });

  it("validates select membership", () => {
    const d = def({ type: "select", options: ["A", "B"] });
    expect(coerceFieldValue(d, "A")).toEqual({ value: "A" });
    expect(coerceFieldValue(d, "Z").error).toMatch(/not a valid option/i);
  });

  it("validates multiselect membership and returns array", () => {
    const d = def({ type: "multiselect", options: ["A", "B", "C"] });
    expect(coerceFieldValue(d, ["A", "C"])).toEqual({ value: ["A", "C"] });
    expect(coerceFieldValue(d, ["A", "Z"]).error).toMatch(/not a valid option/i);
  });

  it("validates url format", () => {
    expect(coerceFieldValue(def({ type: "url" }), "https://x.com")).toEqual({
      value: "https://x.com",
    });
    expect(coerceFieldValue(def({ type: "url" }), "not-a-url").error).toMatch(/url/i);
  });

  it("flags required empty values", () => {
    expect(coerceFieldValue(def({ type: "text", required: true }), "").error).toMatch(
      /required/i,
    );
  });

  it("allows optional empty values as null", () => {
    expect(coerceFieldValue(def({ type: "text" }), "")).toEqual({ value: null });
  });
});

describe("validateCustomValues", () => {
  const defs: FieldDef[] = [
    def({ key: "venue", type: "text", required: true }),
    def({ key: "guests", type: "number" }),
    def({ key: "contractDone", type: "boolean" }),
  ];

  it("returns coerced values when valid", () => {
    const res = validateCustomValues(defs, {
      venue: "Grand Hall",
      guests: "150",
      contractDone: "on",
    });
    expect(res.errors).toEqual({});
    expect(res.values).toEqual({ venue: "Grand Hall", guests: 150, contractDone: true });
  });

  it("collects errors per field", () => {
    const res = validateCustomValues(defs, { venue: "", guests: "x" });
    expect(Object.keys(res.errors).sort()).toEqual(["guests", "venue"]);
  });
});
