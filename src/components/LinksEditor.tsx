"use client";

import { useState } from "react";

type Row = { id: number; label: string; url: string };

/**
 * Dynamic list of external link rows on the ticket form. Each row is two
 * inputs (label + url) plus a remove button; an "Add link" button appends a
 * new blank row. Uncontrolled inputs keyed by a stable id, so React keeps
 * each row's typed text when other rows are added/removed.
 *
 * The form submission picks up every rendered input by `name` (linkLabel /
 * linkUrl); removed rows are simply not in the DOM and don't submit. The
 * server's parseLinks helper still skips rows with no URL, so empty defaults
 * like "Contract" don't get stored unless the user fills in a URL.
 */
export function LinksEditor({
  initial,
}: {
  initial: { label: string; url: string }[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r, i) => ({ id: i, label: r.label, url: r.url })),
  );
  const [nextId, setNextId] = useState(initial.length);

  function addRow() {
    setRows((rs) => [...rs, { id: nextId, label: "", url: "" }]);
    setNextId((n) => n + 1);
  }
  function removeRow(id: number) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.id}
          className="row link-row"
          style={{ alignItems: "center", marginBottom: "0.5rem" }}
        >
          <input
            name="linkLabel"
            placeholder="Label (e.g. Contract)"
            defaultValue={r.label}
            style={{ flex: "1 1 160px" }}
          />
          <input
            name="linkUrl"
            placeholder="https://…"
            defaultValue={r.url}
            type="url"
            style={{ flex: "2 1 240px" }}
          />
          <button
            type="button"
            onClick={() => removeRow(r.id)}
            title="Remove this link"
            aria-label="Remove this link"
            className="link-remove"
          >
            ✕
          </button>
        </div>
      ))}

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          marginTop: "0.5rem",
        }}
      >
        <button type="button" onClick={addRow}>
          + Add link
        </button>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          Empty labels default to the URL. Rows with no URL are skipped on save.
        </span>
      </div>
    </div>
  );
}
