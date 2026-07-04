"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";

/**
 * A card that tracks the cursor and reveals two radial-gradient overlays — a
 * soft interior glow and a bright 1px border highlight (via a masked layer).
 * The mouse position is written to CSS custom properties `--mouse-x/--mouse-y`
 * which the overlay gradients read.
 */
export function FlashlightCard({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "a";
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  return (
    <Tag
      ref={ref as never}
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden ${className}`}
    >
      {/* Interior glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.06), transparent 40%)",
          zIndex: 0,
        }}
      />
      {/* Bright border highlight */}
      <div
        className="pointer-events-none absolute -inset-px rounded-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.4), transparent 40%)",
          zIndex: 0,
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box exclude, linear-gradient(#fff 0 0)",
          mask: "linear-gradient(#fff 0 0) content-box exclude, linear-gradient(#fff 0 0)",
          padding: "1px",
        }}
      />
      {children}
    </Tag>
  );
}
