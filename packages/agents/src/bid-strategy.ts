export type BidStrategy =
  | { type: "conservative" }
  | { type: "balanced" }
  | { type: "aggressive" }
  | { type: "undercut"; pct: number };

// Returns a bid price (wei) <= maxBounty. `best` is the current lowest bid (0n if none).
export function priceForStrategy(strategy: BidStrategy, maxBounty: bigint, best: bigint): bigint {
  const frac = (n: number, d: number) => (maxBounty * BigInt(n)) / BigInt(d);
  let price: bigint;
  switch (strategy.type) {
    case "conservative": price = frac(80, 100); break;
    case "balanced":     price = frac(60, 100); break;
    case "aggressive":   price = frac(40, 100); break;
    case "undercut": {
      const base = best > 0n ? best : maxBounty;
      price = (base * BigInt(100 - Math.min(90, Math.max(1, strategy.pct)))) / 100n;
      break;
    }
    default: price = frac(60, 100);
  }
  if (best > 0n && price >= best) price = best - 1n;
  if (price > maxBounty) price = maxBounty;
  if (price < 1n) price = 1n;
  return price;
}
