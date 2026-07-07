// BOT Chain has no per-task timestamp in the projection — only the block number of
// the last activity (updated_block). Blocks are ~0.75s apart, so we derive a
// relative "time ago" from how many blocks have passed since then, using the live
// chain head the dashboard already polls. Approximate but perfect for a "3m ago"
// label, and needs no backend/schema change.
const BLOCK_TIME_S = 0.75;

// Given the last-activity block and the current chain head, return "just now" /
// "5m ago" / "3h ago" / "2d ago". Returns null when we can't compute it.
export function blocksAgo(updatedBlock: number | null | undefined, currentBlock: number | undefined): string | null {
  if (updatedBlock == null || currentBlock == null) return null;
  const delta = currentBlock - updatedBlock;
  if (delta < 0) return "just now"; // clock/head skew — don't show a negative
  const seconds = delta * BLOCK_TIME_S;
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
