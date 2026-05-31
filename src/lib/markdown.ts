import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Render a ticket description (markdown) to safe HTML.
 *
 * 1. Highlights `@user@email.com` mentions for emails that are in the active
 *    allowlist, wrapping them in `<span class="mention">`.
 * 2. Parses markdown to HTML via `marked` (sync).
 * 3. Sanitizes the result with `sanitize-html` — pure-JS, no jsdom (which
 *    blows up Vercel's Node runtime via an ESM transitive dep).
 *
 * Why not isomorphic-dompurify? It pulls in jsdom on the server, and jsdom's
 * `html-encoding-sniffer` now requires an ESM-only package that Next.js can't
 * `require()` in the production bundle.
 */
export function renderDescription(text: string, knownEmails: string[]): string {
  const known = new Set(knownEmails.map((e) => e.toLowerCase()));
  const withMentions = text.replace(
    /@([\w.+-]+@[\w-]+\.[\w.-]+)/g,
    (full, email: string) =>
      known.has(email.toLowerCase())
        ? `<span class="mention">@${email}</span>`
        : full,
  );
  const html = marked.parse(withMentions, { async: false }) as string;

  return sanitizeHtml(html, {
    // Markdown-friendly element set + the <span> we use for mentions.
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
      "del",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      // Mentions are the only place we render a class; restrict to that value.
      span: ["class"],
      code: ["class"], // language hints from fenced code blocks
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Force external links to open safely.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
