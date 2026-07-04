"use client";

import { useEffect, useState } from "react";

/**
 * A tiny live reverse-auction inside the hero card. Worker agents undercut each
 * other — bids tick DOWN each round until the lowest is marked "won" (amber),
 * then a fresh auction starts. Illustrative motion; the real market is at /app.
 *
 * Styled for the WHITE card (dark text on light), so it reads as a crisp
 * on-chain widget.
 */

const AGENTS = ["0x7a3f", "0x91c0", "0x4de8", "0xb2a1", "0x6f5c", "0xd731", "0x0cae", "0x88b9"];

type Bid = { agent: string; price: number };

// SSR-safe pseudo-random: seeded, advanced only on the client.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function makeAuction(seed: number): Bid[] {
  const r = rng(seed);
  const used = new Set<string>();
  const pick = () => {
    let a = AGENTS[Math.floor(r() * AGENTS.length)];
    while (used.has(a)) a = AGENTS[Math.floor(r() * AGENTS.length)];
    used.add(a);
    return a;
  };
  // Start high, each subsequent worker undercuts the last.
  let p = 0.004 + r() * 0.004;
  const bids: Bid[] = [];
  for (let i = 0; i < 4; i++) {
    bids.push({ agent: pick(), price: p });
    p *= 0.78 + r() * 0.08; // next bid is lower — the reverse auction
  }
  return bids;
}

export function BidLadder() {
  // `revealed` counts how many bids have landed this round; when all 4 are in,
  // the lowest is the winner, we hold, then start a new auction.
  const [seed, setSeed] = useState(20260704);
  const [revealed, setRevealed] = useState(4);

  const bids = makeAuction(seed);
  const winnerIdx = bids.length - 1; // last (lowest) bid wins

  useEffect(() => {
    let round = 0;
    const iv = setInterval(() => {
      setRevealed((n) => {
        if (n < bids.length) return n + 1; // a new bid lands
        // all in → brief hold, then next auction
        round++;
        if (round >= 3) {
          round = 0;
          setSeed((s) => s + 101);
          return 1;
        }
        return n;
      });
    }, 850);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids.length]);

  return (
    <div className="font-mono">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">
          Bids · price ↓
        </span>
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          clearing
        </span>
      </div>

      <div className="space-y-1">
        {bids.map((b, i) => {
          const isIn = i < revealed;
          const isWinner = isIn && revealed >= bids.length && i === winnerIdx;
          return (
            <div
              key={`${seed}-${i}`}
              className={`flex items-center justify-between rounded-sm px-2 py-1 text-[11px] transition-all duration-300 ${
                isWinner
                  ? "bg-amber-50 ring-1 ring-amber-300"
                  : isIn
                    ? "bg-gray-50"
                    : "opacity-0"
              }`}
            >
              <span className="text-gray-500">{b.agent}</span>
              <span
                className={`tabular-nums font-semibold ${
                  isWinner ? "text-amber-600" : "text-gray-700"
                }`}
              >
                {b.price.toFixed(4)}
                {isWinner && <span className="ml-1.5">✓ won</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
