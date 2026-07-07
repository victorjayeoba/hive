import { verifyMessage } from "viem";
import { insertUserAgent, countAgentsByOwner } from "./db.js";

const MAX_AGENTS_PER_OWNER = 10;

export function createAgentMessage(ownerAddress: string, payoutAddress: string): string {
  return [
    "Hive Agent Platform — create agent",
    `owner: ${ownerAddress.toLowerCase()}`,
    `payout: ${payoutAddress.toLowerCase()}`,
    "I authorize Hive to run an autonomous worker agent and settle earnings to my payout address.",
  ].join("\n");
}

export interface CreateAgentBody {
  name: string;
  systemPrompt: string;
  ownerAddress: string;
  payoutAddress: string;
  taskTypes: string[];
  bidStrategy: Record<string, unknown>;
  signature: `0x${string}`;
}

export interface CreateAgentDeps {
  provisionExecWallet: (agent: { name: string; ownerAddress: string }) => Promise<string>;
}

export type CreateAgentResult =
  | { ok: true; execAddress: string }
  | { ok: false; status: number; error: string };

export async function handleCreateAgent(body: CreateAgentBody, deps: CreateAgentDeps): Promise<CreateAgentResult> {
  if (!body.name || !body.systemPrompt || !body.ownerAddress || !body.payoutAddress) {
    return { ok: false, status: 400, error: "missing required fields" };
  }
  if (countAgentsByOwner(body.ownerAddress) >= MAX_AGENTS_PER_OWNER) {
    return { ok: false, status: 429, error: "agent limit reached for this owner" };
  }
  const message = createAgentMessage(body.ownerAddress, body.payoutAddress);
  let valid = false;
  try {
    valid = await verifyMessage({ address: body.ownerAddress as `0x${string}`, message, signature: body.signature });
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, status: 400, error: "invalid signature" };

  const execAddress = await deps.provisionExecWallet({ name: body.name, ownerAddress: body.ownerAddress });
  insertUserAgent({
    execAddress,
    name: body.name,
    systemPrompt: body.systemPrompt,
    ownerAddress: body.ownerAddress,
    payoutAddress: body.payoutAddress,
    taskTypes: body.taskTypes,
    bidStrategy: body.bidStrategy,
    createdSig: body.signature,
  });
  return { ok: true, execAddress };
}
