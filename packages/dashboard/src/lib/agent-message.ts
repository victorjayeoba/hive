// Byte-for-byte identical to the indexer's createAgentMessage (agents-api.ts).
// The server verifies the signature against this exact string, so the two MUST
// stay in lockstep.
export function createAgentMessage(ownerAddress: string, payoutAddress: string): string {
  return [
    "Hive Agent Platform — create agent",
    `owner: ${ownerAddress.toLowerCase()}`,
    `payout: ${payoutAddress.toLowerCase()}`,
    "I authorize Hive to run an autonomous worker agent and settle earnings to my payout address.",
  ].join("\n");
}
