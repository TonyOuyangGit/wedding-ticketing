"use client";

import { useRouter } from "next/navigation";

/**
 * A dashboard table row where clicking anywhere opens the ticket. Keyboard
 * users can focus the row and press Enter/Space. The cells themselves are
 * passed as children from the server component.
 */
export function TicketRow({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      className="row-link"
      style={{ cursor: "pointer" }}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      tabIndex={0}
    >
      {children}
    </tr>
  );
}
