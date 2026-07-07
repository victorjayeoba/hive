import { market } from "./chain.js";
import { verify } from "./verifier.js";
import { publishSpec, readSpec, readResult } from "./store.js";
import type { TaskSpec } from "./execute.js";
import { Status, hiveMarketAbi } from "@hive/shared";

// A requester posts + funds tasks, then verifies submissions and accepts or rejects.
// Tasks come from a queue (seeded real specs); the requester never does the work.
export async function runRequester(
  privateKey: `0x${string}`,
  queue: TaskSpec[],
  opts: { bounty: bigint; bidWindow: bigint; workWindow: bigint; pollMs?: number } = {
    bounty: 1000000000000000n, bidWindow: 4n, workWindow: 12n,
  },
) {
  const m = market(privateKey);
  const me = m.account.address.toLowerCase();
  const posted = new Map<string, TaskSpec>();
  const startBlock = await m.client.getBlockNumber();
  // Start the settle scan a lookback window BEHIND the head so a freshly (re)started
  // requester still settles tasks that were submitted shortly before it started —
  // including tasks posted from the dashboard while the requester was down. Without
  // this, a submitted task's event is in the past, never scanned, never accepted →
  // it times out into a refund and the worker's completed work never counts.
  let cursor = startBlock > 2000n ? startBlock - 2000n : 0n;
  let next = 0;

  console.log(`[requester] up as ${m.account.address}, ${queue.length} tasks queued`);

  async function postNext() {
    if (next >= queue.length) return;
    const spec = queue[next++];
    const { specHash, inputHash } = publishSpec(spec);
    const hash = await m.write.postTask(
      [specHash, inputHash, opts.bidWindow, opts.workWindow],
      { value: opts.bounty },
    );
    const receipt = await m.client.waitForTransactionReceipt({ hash });
    // Recover the task id from the current counter (single requester in v1).
    const id = (await m.read.nextTaskId()) - 1n;
    posted.set(id.toString(), spec);
    console.log(`[requester] posted task ${id} (${spec.kind}) in block ${receipt.blockNumber}`);
  }

  async function settleSubmitted() {
    const head = await m.client.getBlockNumber();
    if (head < cursor) return;
    const events = await m.client.getContractEvents({
      address: m.address, abi: hiveMarketAbi,
      eventName: "Submitted", fromBlock: cursor, toBlock: head,
    });
    for (const e of events) {
      const id = e.args.id as bigint;
      const t = await m.read.getTask([id]);
      if (t.status !== Status.Submitted || t.requester.toLowerCase() !== me) continue;
      const spec = (await readSpec(t.specHash)) ?? posted.get(id.toString());
      const result = await readResult(t.resultHash);
      // Only REJECT when we can read both spec and result AND the result genuinely
      // fails verification. If content is unreadable (e.g. a dashboard-posted task
      // whose content this process can't reach), accept rather than punish the
      // worker for an infra gap — the worker did commit a result hash on-chain.
      const readable = Boolean(spec && result);
      const ok = readable ? verify(spec!, result!) : true;
      if (ok) {
        await m.write.accept([id]);
        console.log(`[requester] accepted task ${id} → worker paid${readable ? "" : " (content unreadable; accepted)"}`);
      } else {
        await m.write.reject([id]);
        console.log(`[requester] rejected task ${id}`);
      }
    }
    cursor = head + 1n;
  }

  // Award any of our posted tasks whose bid window has closed. Keeper-style; the
  // contract makes award() permissionless, but the requester triggers it reliably.
  async function awardClosed() {
    const head = await m.client.getBlockNumber();
    for (const idStr of posted.keys()) {
      const id = BigInt(idStr);
      const t = await m.read.getTask([id]);
      if (t.status === Status.Bidding && head >= t.bidCloseBlock) {
        try { await m.write.award([id]); console.log(`[requester] awarded task ${id}`); }
        catch { /* someone else awarded first */ }
      }
    }
  }

  while (true) {
    try {
      await postNext();
      await awardClosed();
      await settleSubmitted();
    } catch (err) {
      console.error("[requester] loop error", err);
    }
    await new Promise((r) => setTimeout(r, opts.pollMs ?? 1500));
  }
}
