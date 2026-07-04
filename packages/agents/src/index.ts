import { runWorker } from "./worker.js";
import { runRequester } from "./requester.js";
import { seedTasks } from "./seed.js";

// One process type, parameterized by role. Usage:
//   tsx src/index.ts worker <PRIVATE_KEY> <label>
//   tsx src/index.ts requester <PRIVATE_KEY>
const [role, key, label] = process.argv.slice(2);

if (role === "worker") {
  await runWorker(key as `0x${string}`, label ?? "worker");
} else if (role === "requester") {
  await runRequester(key as `0x${string}`, seedTasks());
} else {
  console.error("usage: tsx src/index.ts <worker|requester> <privateKey> [label]");
  process.exit(1);
}
