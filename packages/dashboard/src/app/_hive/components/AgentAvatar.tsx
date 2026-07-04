/**
 * Web3-style generated agent avatar — a deterministic identicon derived from an
 * agent's address, the way wallet identicons work. Same address → same avatar,
 * every time. Pure SVG (no external service), themed to Hive's violet + amber.
 *
 * The address is hashed into: a background hue, an accent hue, and a small
 * symmetric 5×5 pixel pattern (mirrored left↔right like classic identicons).
 */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Hive-flavoured palette: violets, indigos, and a honey amber, on dark cells.
const BG = ["#2a1a55", "#3a2170", "#1f1747", "#4a2d80", "#2d2160"];
const FG = ["#c9a2ff", "#f5b841", "#a855f7", "#ffd787", "#8b7dff"];

export function AgentAvatar({
  seed,
  className = "",
}: {
  /** Agent address / id — same seed always renders the same avatar. */
  seed: string;
  className?: string;
}) {
  const h = hash(seed);
  const bg = BG[h % BG.length];
  const fg = FG[(h >> 3) % FG.length];

  // Build a symmetric 5×5 grid: decide the left 3 columns from the hash bits,
  // mirror columns 0,1 to 4,3 for that classic identicon symmetry.
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells.push(((h >> i) & 1) === 1);

  const rects: { x: number; y: number }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let col = 0; col < 3; col++) {
      if (cells[y * 3 + col]) {
        rects.push({ x: col, y });
        if (col < 2) rects.push({ x: 4 - col, y }); // mirror
      }
    }
  }

  return (
    <svg viewBox="0 0 5 5" className={className} aria-hidden="true">
      <rect width="5" height="5" fill={bg} />
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width="1" height="1" fill={fg} />
      ))}
    </svg>
  );
}
