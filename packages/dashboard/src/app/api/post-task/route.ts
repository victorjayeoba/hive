import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfig, hiveChain, hiveMarketAbi, marketAddress } from "@hive/shared";
import { keccak256, toHex } from "viem";

// The dashboard runs on separate infra (Vercel) from the swarm/indexer (VPS), so
// a local file store is NOT shared with the worker that fulfils the task. Publish
// the spec/input to the INDEXER's /content endpoint — the shared store that both
// the swarm's readSpec() and the worker read from. Without this, the worker can't
// find the spec, does no work, and the task times out → refunded.
const INDEXER_HTTP = process.env.NEXT_PUBLIC_INDEXER_HTTP ?? process.env.HIVE_INDEXER_HTTP ?? "http://localhost:4000";

async function publishToStore(specHash: string, inputHash: string, spec: object, input: string) {
  async function put(key: string, value: unknown) {
    const res = await fetch(`${INDEXER_HTTP}/content`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error(`indexer /content ${res.status}`);
  }
  await Promise.all([put(specHash, spec), put(inputHash, input)]);
}

// Lets a judge post a real task live from the dashboard. Uses the requester key
// server-side; posts a genuine task on-chain (the swarm picks it up from there).
export async function POST() {
  const key = process.env.REQUESTER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key || !marketAddress) {
    return NextResponse.json({ error: "requester key or market address not configured" }, { status: 500 });
  }

  // Surface the exact missing/failing config instead of throwing a blank 500.
  // chainConfig.rpcUrl lazily calls required("RPC_URL")/required("CHAIN_ID"),
  // which THROW when unset — a common Vercel misconfig.
  let rpcUrl: string;
  try {
    rpcUrl = chainConfig.rpcUrl;
    if (!process.env.CHAIN_ID) throw new Error("CHAIN_ID not set");
  } catch (e) {
    return NextResponse.json(
      { error: `chain config missing (${(e as Error).message}). Set RPC_URL and CHAIN_ID in the environment.` },
      { status: 500 },
    );
  }

  const spec = {
    kind: "summarize",
    prompt: "Summarize the following text in one sentence of at most 20 words.",
    input:
      "Hive is the market for AI work on BOT Chain: you ask for on-chain analysis, worker agents " +
      "compete in a reverse auction to deliver the cheapest correct answer, and every result settles on-chain.",
  };

  const specHash = keccak256(toHex(JSON.stringify({ kind: spec.kind, prompt: spec.prompt })));
  const inputHash = keccak256(toHex(spec.input));

  try {
    const account = privateKeyToAccount(key);
    const wallet = createWalletClient({ account, chain: hiveChain, transport: http(rpcUrl) });
    const client = createPublicClient({ chain: hiveChain, transport: http(rpcUrl) });

    // Publish content to the shared indexer store BEFORE posting on-chain, so the
    // spec is readable the instant a worker wins. If this fails, don't post a task
    // no one can fulfil — surface the error instead.
    try {
      await publishToStore(specHash, inputHash, { kind: spec.kind, prompt: spec.prompt, input: spec.input }, spec.input);
    } catch (e) {
      return NextResponse.json(
        { error: `could not publish task content to the indexer (${(e as Error).message}). Check NEXT_PUBLIC_INDEXER_HTTP.` },
        { status: 502 },
      );
    }

    const hash = await wallet.writeContract({
      address: marketAddress,
      abi: hiveMarketAbi,
      functionName: "postTask",
      args: [specHash, inputHash, 10n, 30n],
      value: 1000000000000000n,
    });
    await client.waitForTransactionReceipt({ hash });

    return NextResponse.json({ ok: true, txHash: hash });
  } catch (e) {
    // No more blank 500s — always return a readable reason.
    return NextResponse.json(
      { error: `post-task failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
