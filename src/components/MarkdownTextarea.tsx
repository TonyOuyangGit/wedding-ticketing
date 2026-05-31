"use client";

import { useRef } from "react";

/**
 * A textarea with a lightweight markdown toolbar. The buttons insert markdown
 * syntax around the current selection (or at the cursor), so the stored value
 * stays plain markdown — no rich-text format, no extra dependencies. Used both
 * for the inline description editor and the ticket form's description field.
 */
export function MarkdownTextarea({
  name,
  defaultValue,
  rows = 10,
  placeholder,
  autoFocus,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Wrap the current selection with `before`/`after` (e.g. ** ** for bold). With
  // no selection, drops the markers in and places the cursor between them.
  function wrap(before: string, after: string = before) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    ta.value = value.slice(0, s) + before + sel + after + value.slice(e);
    ta.focus();
    if (sel) {
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    } else {
      const pos = s + before.length;
      ta.setSelectionRange(pos, pos);
    }
  }

  // Prepend `prefix` to each line touched by the selection (lists, quote,
  // heading). `ordered` numbers the lines instead of a static prefix.
  function prefixLines(prefix: string, ordered = false) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const segment = value.slice(lineStart, e);
    const lines = segment.length ? segment.split("\n") : [""];
    const out = lines
      .map((l, i) => (ordered ? `${i + 1}. ` : prefix) + l)
      .join("\n");
    ta.value = value.slice(0, lineStart) + out + value.slice(e);
    ta.focus();
    ta.setSelectionRange(lineStart, lineStart + out.length);
  }

  // Insert a markdown link, using any selected text as the link label.
  function link() {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || "label";
    const snippet = `[${sel}](url)`;
    ta.value = value.slice(0, s) + snippet + value.slice(e);
    ta.focus();
    // Select the "url" placeholder so the user can type the address.
    const urlStart = s + sel.length + 3; // "[" + sel + "]("
    ta.setSelectionRange(urlStart, urlStart + 3);
  }

  const Btn = ({
    label,
    title,
    onClick,
    style,
  }: {
    label: string;
    title: string;
    onClick: () => void;
    style?: React.CSSProperties;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="md-tool"
      style={style}
    >
      {label}
    </button>
  );

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        <Btn label="B" title="Bold" onClick={() => wrap("**")} style={{ fontWeight: 700 }} />
        <Btn label="I" title="Italic" onClick={() => wrap("*")} style={{ fontStyle: "italic" }} />
        <Btn label="S" title="Strikethrough" onClick={() => wrap("~~")} style={{ textDecoration: "line-through" }} />
        <span className="md-sep" />
        <Btn label="H2" title="Heading" onClick={() => prefixLines("## ")} />
        <Btn label="“ ”" title="Quote" onClick={() => prefixLines("> ")} />
        <Btn label="‹/›" title="Code" onClick={() => wrap("`")} />
        <span className="md-sep" />
        <Btn label="• List" title="Bullet list" onClick={() => prefixLines("- ")} />
        <Btn label="1. List" title="Numbered list" onClick={() => prefixLines("", true)} />
        <span className="md-sep" />
        <Btn label="🔗 Link" title="Insert link" onClick={link} />
      </div>
      <textarea
        ref={ref}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}
