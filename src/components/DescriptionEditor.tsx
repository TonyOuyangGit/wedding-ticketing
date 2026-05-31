"use client";

import { useState } from "react";
import { MarkdownTextarea } from "@/components/MarkdownTextarea";

/**
 * Inline-editable description. Shows rendered markdown; click it to switch to a
 * textarea, then Save (submits to the server action) or Cancel. The rendered
 * HTML is produced on the server and passed in via `html`.
 */
export function DescriptionEditor({
  html,
  raw,
  action,
}: {
  html: string;
  raw: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Description</h2>
          <button type="button" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
        <div
          onClick={() => setEditing(true)}
          style={{ cursor: "text" }}
          title="Click to edit"
        >
          {html ? (
            <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="muted">No description yet — click to add one.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      action={action}
      onSubmit={() => setEditing(false)}
      className="card"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Description</h2>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          Markdown · use @email to mention an allowlisted user
        </span>
      </div>
      <MarkdownTextarea
        name="description"
        rows={10}
        defaultValue={raw}
        autoFocus
        placeholder="Notes, rundown highlights, @dj@example.com please confirm music…"
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <button type="submit" className="primary">
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
