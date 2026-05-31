"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Option = { id: string; name: string | null; email?: string };

/**
 * Dashboard filter toolbar that applies filters automatically — changing the
 * stage or assignee navigates immediately; typing in the search box applies
 * after a short debounce. No explicit "Filter" button.
 */
export function DashboardFilters({
  stages,
  users,
  q,
  stage,
  assignee,
}: {
  stages: Option[];
  users: Option[];
  q: string;
  stage: string;
  assignee: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="toolbar">
      <div>
        <label>Search client</label>
        <input
          name="q"
          defaultValue={q}
          placeholder="Client name"
          onChange={(e) => {
            const v = e.target.value;
            if (debounce.current) clearTimeout(debounce.current);
            debounce.current = setTimeout(() => apply({ q: v }), 300);
          }}
        />
      </div>
      <div>
        <label>Stage</label>
        <select
          name="stage"
          defaultValue={stage}
          onChange={(e) => apply({ stage: e.target.value })}
        >
          <option value="">All</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Assignee (MC/DJ)</label>
        <select
          name="assignee"
          defaultValue={assignee}
          onChange={(e) => apply({ assignee: e.target.value })}
        >
          <option value="">Anyone</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>
      </div>
      <button type="button" onClick={() => router.push("/")}>
        Reset
      </button>
    </div>
  );
}
