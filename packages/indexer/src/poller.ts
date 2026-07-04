import { createPublicClient, http, type Log } from "viem";
import { chainConfig, hiveChain, hiveMarketAbi, reputationAbi, marketAddress } from "@hive/shared";
import { db, getCursor, setCursor, addEarned, recordTx, resetIfNewDeployment } from "./db.js";

type EventLog = Log & { eventName?: string; args?: Record<string, unknown> };

const str = (v: unknown) => String(v);
const num = (v: unknown) => Number(v);

// Polls all HiveMarket + Reputation events from the deploy block forward and folds
// them into the SQLite projection. Polling (not websockets) is the safe default on
// testnets. ReputationUpdated is emitted by the Reputation contract (a separate
// address the market deploys), so we resolve and watch it too.
export function startPoller(onChange: () => void) {
  const client = createPublicClient({ chain: hiveChain, transport: http(chainConfig.rpcUrl) });
  if (!marketAddress) throw new Error("HIVE_MARKET_ADDRESS not set — deploy first");
  const market = marketAddress;
  resetIfNewDeployment(market);

  const deployBlock = BigInt(process.env.DEPLOY_BLOCK ?? 0);
  let reputationAddr: `0x${string}` | undefined;

  async function resolveReputation() {
    reputationAddr = (await client.readContract({
      address: market, abi: hiveMarketAbi, functionName: "reputation",
    })) as `0x${string}`;
  }

  async function tick() {
    const head = await client.getBlockNumber();
    const from = getCursor(deployBlock);
    if (head < from) return;

    const sources: { address: `0x${string}`; abi: typeof hiveMarketAbi | typeof reputationAbi }[] = [
      { address: market, abi: hiveMarketAbi },
    ];
    if (reputationAddr) sources.push({ address: reputationAddr, abi: reputationAbi });

    const logs = (
      await Promise.all(
        sources.map((s) =>
          client.getContractEvents({ address: s.address, abi: s.abi, fromBlock: from, toBlock: head }),
        ),
      )
    ).flat() as EventLog[];

    if (logs.length > 0) {
      logs.sort((x, y) => Number((x.blockNumber ?? 0n) - (y.blockNumber ?? 0n)));
      for (const log of logs) apply(log);
      onChange();
    }
    setCursor(head + 1n);
  }

  function apply(log: EventLog) {
    const a = log.args ?? {};
    const tx = log.transactionHash ?? "";
    const block = log.blockNumber ?? 0n;

    switch (log.eventName) {
      case "TaskPosted":
        db.prepare(`INSERT OR REPLACE INTO tasks
          (id, requester, max_bounty, status, spec_hash, posted_tx, updated_block)
          VALUES (?, ?, ?, 2, ?, ?, ?)`)
          .run(num(a.id), str(a.requester), str(a.maxBounty), str(a.specHash), tx, num(block));
        recordTx(tx, "post", undefined, block);
        break;
      case "BidPlaced":
        db.prepare("INSERT INTO bids (task_id, worker, price, tx_hash, block) VALUES (?, ?, ?, ?, ?)")
          .run(num(a.id), str(a.worker), str(a.price), tx, num(block));
        recordTx(tx, "bid", undefined, block);
        break;
      case "Awarded":
        db.prepare("UPDATE tasks SET worker = ?, price = ?, status = 3, updated_block = ? WHERE id = ?")
          .run(str(a.worker), str(a.price), num(block), num(a.id));
        recordTx(tx, "award", undefined, block);
        break;
      case "Submitted":
        db.prepare("UPDATE tasks SET result_hash = ?, status = 4, updated_block = ? WHERE id = ?")
          .run(str(a.resultHash), num(block), num(a.id));
        recordTx(tx, "submit", undefined, block);
        break;
      case "Settled":
        db.prepare("UPDATE tasks SET status = 5, settled_tx = ?, updated_block = ? WHERE id = ?")
          .run(tx, num(block), num(a.id));
        addEarned(str(a.worker), BigInt(str(a.paid)));
        recordTx(tx, "settle", undefined, block);
        break;
      case "Refunded":
        db.prepare("UPDATE tasks SET status = 6, settled_tx = ?, updated_block = ? WHERE id = ?")
          .run(tx, num(block), num(a.id));
        recordTx(tx, "refund", undefined, block);
        break;
      case "ReputationUpdated":
        db.prepare(`INSERT OR REPLACE INTO agents (address, completed, timed_out, disputed, earned)
          VALUES (?, ?, ?, ?, COALESCE((SELECT earned FROM agents WHERE address = ?), '0'))`)
          .run(str(a.agent), num(a.completed), num(a.timedOut), num(a.disputed), str(a.agent));
        break;
    }
  }

  let stopped = false;
  void resolveReputation().catch((err) => console.error("[indexer] resolve reputation failed", err));
  const interval = setInterval(() => {
    if (stopped) return;
    tick().catch((err) => console.error("[indexer] poll error", err));
  }, 1000);

  return () => { stopped = true; clearInterval(interval); };
}
