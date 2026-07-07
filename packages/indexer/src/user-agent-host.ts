import { createPublicClient, http } from "viem";
import { hiveChain, chainConfig } from "@hive/shared";
import { runAgent } from "@hive/agents/worker";
import { sweepEarnings } from "@hive/agents/sweep";
import { listUserAgents } from "./db.js";
import { getExecKey } from "./provision.js";

// Exec private keys live ONLY in this (indexer) process's memory — see
// provision.ts. So the loop that actually *runs* user agents must also live here,
// where getExecKey(address) can return the key without ever persisting or
// transmitting it. This host polls the registry and, for each active agent whose
// key is available in-process, starts a runAgent loop plus a periodic sweep of
// earnings to the owner's payout address.
const started = new Set<string>();

export function startUserAgentHost() {
  const client = createPublicClient({ chain: hiveChain, transport: http(chainConfig.rpcUrl) });

  async function tick() {
    const agents = listUserAgents();
    for (const a of agents) {
      if (a.status !== "active" || started.has(a.execAddress)) continue;
      const key = getExecKey(a.execAddress);
      // No key in this process (e.g. the agent was created in a previous run,
      // before this indexer restarted) — nothing we can do until it's re-provisioned.
      if (!key) continue;
      started.add(a.execAddress);
      console.log(`[host] starting user agent ${a.name} (${a.execAddress})`);
      void runAgent({
        execKey: key,
        label: a.name,
        systemPrompt: a.systemPrompt,
        taskTypes: a.taskTypes,
        bidStrategy: a.bidStrategy as never,
      });
      void sweepLoop(a.execAddress, key, a.payoutAddress as `0x${string}`, client);
    }
  }

  setInterval(() => void tick().catch((e) => console.error("[host] tick error", e)), 3000);
  console.log("[host] user-agent host started");
}

async function sweepLoop(
  execAddress: string,
  key: `0x${string}`,
  payout: `0x${string}`,
  client: ReturnType<typeof createPublicClient>,
) {
  setInterval(async () => {
    try {
      const bal = await client.getBalance({ address: execAddress as `0x${string}` });
      const tx = await sweepEarnings(key, payout, bal);
      if (tx) console.log(`[host] swept ${execAddress} -> ${payout}: ${tx}`);
    } catch (e) {
      console.error("[host] sweep error", e);
    }
  }, 30_000);
}
