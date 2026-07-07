"use client";
import { deriveActivity } from "@/lib/activity";
import type { Snapshot } from "@/lib/types";

export function ActivityMarquee({ snapshot }: { snapshot: Snapshot }) {
  const items = deriveActivity(snapshot, 20);
  if (items.length === 0) return null;
  return (
    <div className="group relative overflow-hidden border-y border-[var(--line)] bg-[var(--panel)]/30 py-2">
      <div className="flex gap-8 whitespace-nowrap animate-[marquee_30s_linear_infinite] group-hover:[animation-play-state:paused]">
        {[...items, ...items].map((it, i) => (
          <a key={i} href={it.href ?? undefined} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-[var(--text-dim)] hover:text-[var(--amber)]">
            {it.label}
          </a>
        ))}
      </div>
    </div>
  );
}
