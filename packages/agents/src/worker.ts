import { keccak256, toHex } from "viem";
import { market } from "./chain.js";
import { execute } from "./execute.js";
import { readSpec, publishResult } from "./store.js";
import { Status, hiveMarketAbi } from "@hive/shared";

// A worker watches for posted tasks, bids a price, and — if it wins — performs the
// real work and submits the result hash. Bidding policy is rule-based and simple
// in v1: bid a random-ish fraction of the max bounty so workers compete.
export async function runWorker(privateKey: `0x${string}`, label: string, pollMs = 1000) {
  const m = market(privateKey);
  const me = m.account.address.toLowerCase();
  let cursor = await m.client.getBlockNumber();
  const bidding = new Set<string>();
  const working = new Set<string>();

  console.log(`[${label}] worker up as ${m.account.address}`);

  // Deterministic-but-varied bid factor per worker so the auction actually clears.
  const bidFactor = 0.4 + (Number(BigInt(me) % 40n) / 100); // 0.40–0.79

  async function tick() {
    const head = await m.client.getBlockNumber();

    // Only scan a fresh block range; skip if nothing new since last cursor.
    const posted = head >= cursor
      ? await m.client.getContractEvents({
          address: m.address, abi: hiveMarketAbi,
          eventName: "TaskPosted", fromBlock: cursor, toBlock: head,
        })
      : [];

    for (const e of posted) {
      const id = e.args.id as bigint;
      if (bidding.has(id.toString())) continue;
      // Re-read fresh state at bid time; the scan-time head may already be stale.
      const t = await m.read.getTask([id]);
      const now = await m.client.getBlockNumber();
      if (t.status !== Status.Bidding || now >= t.bidCloseBlock) continue;

      const price = BigInt(Math.floor(Number(t.maxBounty) * bidFactor));
      // Only bid if we'd actually beat the current best — avoids a guaranteed
      // revert (which would stall this wallet's nonce).
      const [, best] = await m.read.bestBid([id]);
      if (best !== 0n && price >= best) {
        bidding.add(id.toString()); // still track it so we can award/execute
        continue;
      }
      try {
        await m.write.bid([id, price]);
        bidding.add(id.toString());
        console.log(`[${label}] bid ${price} on task ${id}`);
      } catch {
        bidding.add(id.toString());
      }
    }

    // Progress any of our biddable tasks: award after close, then execute if we won.
    for (const idStr of bidding) {
      const id = BigInt(idStr);
      const t = await m.read.getTask([id]);
      if (t.status === Status.Bidding && head >= t.bidCloseBlock) {
        try { await m.write.award([id]); } catch { /* someone else awarded */ }
      }
      if (t.status === Status.Awarded && t.worker.toLowerCase() === me && !working.has(idStr)) {
        working.add(idStr);
        void doWork(id);
      }
    }

    if (head >= cursor) cursor = head + 1n;
  }

  async function doWork(id: bigint) {
    const t = await m.read.getTask([id]);
    const spec = readSpec(t.specHash);
    if (!spec) { console.log(`[${label}] no spec for task ${id}`); return; }
    console.log(`[${label}] executing task ${id} (${spec.kind})`);
    const result = await execute(spec);
    const resultHash = keccak256(toHex(result));
    publishResult(resultHash, result);
    await m.write.submit([id, resultHash]);
    console.log(`[${label}] submitted task ${id}`);
  }

  while (true) {
    try { await tick(); } catch (err) { console.error(`[${label}] tick error`, err); }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}
