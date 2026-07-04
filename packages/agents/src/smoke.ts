// End-to-end smoke test: 1 requester + 3 workers against a local node.
// Posts one task, lets the swarm bid/win/execute/submit, and asserts the task
// reaches Settled with a paid worker. Dev-only (uses MOCK_LLM).
import { market } from "./chain.js";
import { runWorker } from "./worker.js";
import { runRequester } from "./requester.js";
import { seedTasks } from "./seed.js";
import { enableIntervalMining } from "./dev.js";
import { Status, StatusLabel } from "@hive/shared";

// Local Anvil: make blocks advance on a timer so bid/deadline windows close.
await enableIntervalMining(1);

const keys = {
  requester: process.env.REQUESTER_PRIVATE_KEY as `0x${string}`,
  workers: [
    process.env.WORKER_1_PRIVATE_KEY,
    process.env.WORKER_2_PRIVATE_KEY,
    process.env.WORKER_3_PRIVATE_KEY,
  ] as `0x${string}`[],
};

// Launch the agents (they loop forever in the background).
void runRequester(keys.requester, seedTasks().slice(0, 1), {
  bounty: 1000000000000000n, bidWindow: 10n, workWindow: 30n, pollMs: 500,
});
keys.workers.forEach((k, i) => void runWorker(k, `w${i + 1}`, 500));

// Poll task 1 until it settles or we time out.
const m = market(keys.requester);
const deadline = Date.now() + 60_000;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 1000));
  const t = await m.read.getTask([1n]).catch(() => null);
  if (!t) continue;
  console.log(`task 1: ${StatusLabel[t.status as Status]} worker=${t.worker} price=${t.price}`);
  if (t.status === Status.Settled) {
    console.log("\n✅ SMOKE PASS — task settled on-chain, worker paid.");
    process.exit(0);
  }
  if (t.status === Status.Refunded) {
    console.log("\n⚠️  task refunded (no bid or timeout) — check agent logs.");
    process.exit(1);
  }
}
console.log("\n❌ SMOKE TIMEOUT — task never settled.");
process.exit(1);
