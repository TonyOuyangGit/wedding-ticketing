export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "url"
  | "date";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
};

export type CoerceResult = { value: unknown; error?: string };

function isEmpty(raw: unknown): boolean {
  return (
    raw === undefined ||
    raw === null ||
    (typeof raw === "string" && raw.trim() === "") ||
    (Array.isArray(raw) && raw.length === 0)
  );
}

export function coerceFieldValue(def: FieldDef, raw: unknown): CoerceResult {
  // Booleans are special: absence means false, not "missing".
  if (def.type === "boolean") {
    const value = raw === "on" || raw === "true" || raw === true;
    if (def.required && !value) return { value, error: `${def.label} is required` };
    return { value };
  }

  if (isEmpty(raw)) {
    if (def.required) return { value: null, error: `${def.label} is required` };
    return { value: null };
  }

  switch (def.type) {
    case "text":
    case "date":
      return { value: String(raw).trim() };

    case "number": {
      const n = Number(String(raw).trim());
      if (Number.isNaN(n)) return { value: null, error: `${def.label} must be a number` };
      return { value: n };
    }

    case "url": {
      const s = String(raw).trim();
      try {
        new URL(s);
        return { value: s };
      } catch {
        return { value: null, error: `${def.label} must be a valid URL` };
      }
    }

    case "select": {
      const s = String(raw);
      if (!def.options.includes(s))
        return { value: null, error: `${s} is not a valid option for ${def.label}` };
      return { value: s };
    }

    case "multiselect": {
      const arr = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      const invalid = arr.find((v) => !def.options.includes(v));
      if (invalid)
        return { value: null, error: `${invalid} is not a valid option for ${def.label}` };
      return { value: arr };
    }

    default:
      return { value: null, error: `Unknown field type for ${def.label}` };
  }
}

export type ValidationResult = {
  values: Record<string, unknown>;
  errors: Record<string, string>;
};

export function validateCustomValues(
  defs: FieldDef[],
  input: Record<string, unknown>,
): ValidationResult {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const def of defs) {
    const { value, error } = coerceFieldValue(def, input[def.key]);
    if (error) errors[def.key] = error;
    if (value !== null && value !== undefined) values[def.key] = value;
  }

  return { values, errors };
}
