// Brings up the full agent swarm: 1 requester + 3 workers, all against the chain
// in .env. Enables local interval mining so windows close on a dev node. On BOT
// Chain testnet that call is a harmless no-op (real blocks already flow).
import { runWorker } from "@hive/agents/worker";
import { runRequester } from "@hive/agents/requester";
import { seedTasks } from "@hive/agents/seed";
import { enableIntervalMining } from "@hive/agents/dev";

const requesterKey = process.env.REQUESTER_PRIVATE_KEY as `0x${string}`;
const workerKeys = [
  process.env.WORKER_1_PRIVATE_KEY,
  process.env.WORKER_2_PRIVATE_KEY,
  process.env.WORKER_3_PRIVATE_KEY,
].filter(Boolean) as `0x${string}`[];

if (!requesterKey || workerKeys.length === 0) {
  console.error("Set REQUESTER_PRIVATE_KEY and WORKER_1..3_PRIVATE_KEY in .env");
  process.exit(1);
}

await enableIntervalMining(1);

workerKeys.forEach((key, i) => void runWorker(key, `w${i + 1}`));
void runRequester(requesterKey, seedTasks(), {
  bounty: 1000000000000000n, bidWindow: 10n, workWindow: 30n, pollMs: 1000,
});

console.log(`[swarm] running: 1 requester + ${workerKeys.length} workers`);
