import type { FieldDefinition, Stage, User } from "@prisma/client";
import { KEEP_IMPORTED_NAME } from "@/lib/constants";
import { MarkdownTextarea } from "@/components/MarkdownTextarea";
import { LinksEditor } from "@/components/LinksEditor";
import { LocationInput } from "@/components/LocationInput";

type TicketWithLinks = {
  id: string;
  client: string;
  weddingDate: Date | null;
  location: string | null;
  description: string;
  customValues: unknown;
  stageId: string | null;
  mcUserId: string | null;
  mcName: string | null;
  djUserId: string | null;
  djName: string | null;
  contractHandlerId: string | null;
  contractHandlerName: string | null;
  links: { label: string; url: string }[];
};

function userLabel(u: Pick<User, "name" | "email">): string {
  return u.name ?? u.email;
}

/**
 * A user-assignment <select>. When the ticket carries an imported fallback name
 * (no matching user yet), show a hint nudging the admin to create that user.
 */
function UserField({
  name,
  label,
  users,
  selectedId,
  fallbackName,
}: {
  name: string;
  label: string;
  users: Pick<User, "id" | "name" | "email">[];
  selectedId: string | null | undefined;
  fallbackName: string | null | undefined;
}) {
  const hasFallback = !selectedId && !!fallbackName;
  // When the imported name isn't a user yet, pre-select a sentinel option that
  // displays the name, so the field isn't blank and the name survives a save.
  const defaultValue = selectedId ?? (hasFallback ? KEEP_IMPORTED_NAME : "");
  return (
    <div className="field" style={{ flex: "1 1 200px" }}>
      <label>{label}</label>
      <select name={name} defaultValue={defaultValue}>
        <option value="">—</option>
        {hasFallback && (
          <option value={KEEP_IMPORTED_NAME}>{fallbackName} (imported)</option>
        )}
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {userLabel(u)}
          </option>
        ))}
      </select>
      {hasFallback && (
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
          <strong>{fallbackName}</strong> was imported but isn&apos;t a registered
          user. Add them in <a href="/admin">Admin</a>, then select them here to
          assign &amp; enable notifications.
        </p>
      )}
    </div>
  );
}

function DynamicField({
  field,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
}) {
  const name = `cf_${field.key}`;
  // Native HTML5 `required` blocks submission and shows the browser's
  // "Please fill out this field" tooltip — graceful prompt without a server
  // round-trip. Booleans are excluded: "required: true" on Yes/No is a weird
  // edge case (would mean "must be Yes"); leave that to server validation.
  const common = { id: name, name, required: field.required && field.type !== "boolean" };

  switch (field.type) {
    case "boolean":
      return (
        <select {...common} defaultValue={value === true ? "true" : "false"}>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      );
    case "select":
      return (
        <select {...common} defaultValue={value != null ? String(value) : ""}>
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "multiselect":
      return (
        <select
          {...common}
          multiple
          defaultValue={Array.isArray(value) ? (value as string[]) : []}
        >
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "number":
      return (
        <input
          type="number"
          step="any"
          {...common}
          defaultValue={value != null ? String(value) : ""}
        />
      );
    case "date":
      return (
        <input
          type="date"
          {...common}
          defaultValue={value != null ? String(value) : ""}
        />
      );
    case "url":
      return (
        <input
          type="url"
          {...common}
          defaultValue={value != null ? String(value) : ""}
        />
      );
    default:
      return (
        <input
          type="text"
          {...common}
          defaultValue={value != null ? String(value) : ""}
        />
      );
  }
}

export function TicketForm({
  action,
  stages,
  users,
  fields,
  ticket,
  showDescription = true,
  defaultContractHandlerId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  stages: Stage[];
  users: Pick<User, "id" | "name" | "email">[];
  fields: FieldDefinition[];
  ticket?: TicketWithLinks;
  showDescription?: boolean;
  // For new tickets only: pre-select this user as contract handler.
  defaultContractHandlerId?: string | null;
}) {
  const cv = (ticket?.customValues ?? {}) as Record<string, unknown>;
  // New tickets get the two most common link rows pre-labeled (URLs blank, so
  // they're only saved if filled in). Editing shows existing links as-is.
  // Extra blank rows aren't needed any more — LinksEditor has an "Add link"
  // button.
  const existingLinks = ticket?.links ?? [];
  const defaultLinks = ticket
    ? []
    : [
        { label: "Contract", url: "" },
        { label: "Wedding Rundown", url: "" },
      ];
  const initialLinks = [...existingLinks, ...defaultLinks];

  return (
    <form action={action}>
      <div className="row">
        <div className="field" style={{ flex: "2 1 240px" }}>
          <label>Client *</label>
          <input name="client" required defaultValue={ticket?.client ?? ""} />
        </div>
        <div className="field" style={{ flex: "1 1 160px" }}>
          <label>Wedding date</label>
          <input
            type="date"
            name="weddingDate"
            defaultValue={
              ticket?.weddingDate
                ? new Date(ticket.weddingDate).toISOString().slice(0, 10)
                : ""
            }
          />
        </div>
        <div className="field" style={{ flex: "1 1 160px" }}>
          <label>Stage</label>
          <select name="stageId" defaultValue={ticket?.stageId ?? ""}>
            <option value="">—</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row">
        <UserField
          name="mcUserId"
          label="MC"
          users={users}
          selectedId={ticket?.mcUserId}
          fallbackName={ticket?.mcName}
        />
        <UserField
          name="djUserId"
          label="DJ"
          users={users}
          selectedId={ticket?.djUserId}
          fallbackName={ticket?.djName}
        />
        <UserField
          name="contractHandlerId"
          label="Contract handler"
          users={users}
          selectedId={ticket ? ticket.contractHandlerId : defaultContractHandlerId}
          fallbackName={ticket?.contractHandlerName}
        />
      </div>

      <div className="row">
        <div className="field" style={{ flex: "1 1 100%" }}>
          <label>Location</label>
          <LocationInput
            name="location"
            defaultValue={ticket?.location ?? ""}
            placeholder="Venue / address (start typing for suggestions)"
          />
        </div>
      </div>

      {fields.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: "0.75rem" }}>Custom fields</h2>
          <div className="cf-grid">
            {fields.map((f) => (
              <div className="cf-row" key={f.id}>
                <div className="cf-label">
                  {f.label}
                  {f.required ? " *" : ""}
                </div>
                <div className="cf-input">
                  <DynamicField field={f} value={cv[f.key]} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: "0.75rem" }}>External links</h2>
        <LinksEditor initial={initialLinks} />
      </div>

      {showDescription && (
        <div className="field">
          <label>Description (markdown, use @email to mention an allowlisted user)</label>
          <MarkdownTextarea
            name="description"
            rows={8}
            defaultValue={ticket?.description ?? ""}
            placeholder="Notes, rundown highlights, @dj@example.com please confirm music…"
          />
        </div>
      )}

      <button type="submit" className="primary">
        {ticket ? "Save changes" : "Create Event"}
      </button>
    </form>
  );
}
