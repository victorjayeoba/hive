/**
 * Full-viewport structural grid: four vertical guide lines and three horizontal
 * ones, with light beams traveling down two of the verticals. Desktop only.
 */
export function GlobalGrid() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none hidden lg:block h-screen">
      <div className="grid-line-v" style={{ left: "var(--gx-1)" }} />
      <div className="grid-line-v" style={{ left: "var(--gx-2)" }}>
        <div className="beam-v" style={{ animation: "6s ease 1s infinite normal none running beam-v" }} />
      </div>
      <div className="grid-line-v" style={{ left: "var(--gx-3)" }}>
        <div className="beam-v" style={{ animation: "7s ease 3s infinite normal none running beam-v" }} />
      </div>
      <div className="grid-line-v" style={{ left: "var(--gx-4)" }} />
      <div className="grid-line-h" style={{ top: "var(--gy-1)" }} />
      <div className="grid-line-h" style={{ top: "var(--gy-2)" }} />
      <div className="grid-line-h" style={{ top: "var(--gy-3)" }} />
    </div>
  );
}
