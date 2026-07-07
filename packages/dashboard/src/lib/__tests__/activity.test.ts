import { describe, it, expect } from "vitest";
import { deriveActivity } from "../activity";
import type { Snapshot } from "../types";

const snap = {
  tasks: [
    { id: 2, status: 5, price: "500", worker: "0xw", postedUrl: "u", settledUrl: "s", bids: [{ worker: "0xw", price: "500", tx_hash: "0xt", block: 9 }] },
    { id: 1, status: 2, worker: null, bids: [], postedUrl: "p", settledUrl: null },
  ],
  agents: [], counters: {} as any, explorerBase: "https://scan.bohr.life", nativeSymbol: "BOT",
} as unknown as Snapshot;

describe("deriveActivity", () => {
  it("produces newest-first activity items with links", () => {
    const items = deriveActivity(snap, 10);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("label");
    expect(items[0]).toHaveProperty("href");
  });
});
