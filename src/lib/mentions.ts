// Mentions reference allowlisted users by email, written as "@user@example.com".
const MENTION_RE = /@([\w.+-]+@[\w-]+\.[\w.-]+)/g;

export function parseMentions(text: string, knownEmails: string[]): string[] {
  const known = new Set(knownEmails.map((e) => e.toLowerCase()));
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    const email = match[1].toLowerCase();
    if (known.has(email)) found.add(email);
  }
  return [...found];
}

export function diffMentions(
  oldText: string | null,
  newText: string,
  knownEmails: string[],
): string[] {
  const before = new Set(parseMentions(oldText ?? "", knownEmails));
  return parseMentions(newText, knownEmails).filter((e) => !before.has(e));
}
