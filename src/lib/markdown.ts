import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

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
  return DOMPurify.sanitize(html, { ADD_ATTR: ["class"] });
}
