import { describe, it, expect, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createAgentMessage, handleCreateAgent } from "../agents-api.js";
import { db } from "../db.js";

const acct = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

describe("agents-api", () => {
  beforeEach(() => db.exec("DELETE FROM user_agents"));

  it("rejects a bad signature", async () => {
    const res = await handleCreateAgent({
      name: "X", systemPrompt: "p", ownerAddress: acct.address,
      payoutAddress: acct.address, taskTypes: [], bidStrategy: {},
      signature: "0xdeadbeef",
    }, { provisionExecWallet: async () => "0xexec" });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.status).toBe(400);
  });

  it("accepts a valid signature and creates the agent", async () => {
    const message = createAgentMessage(acct.address, acct.address);
    const signature = await acct.signMessage({ message });
    const res = await handleCreateAgent({
      name: "RiskBot", systemPrompt: "assess risk", ownerAddress: acct.address,
      payoutAddress: acct.address, taskTypes: ["wallet-risk"], bidStrategy: { type: "balanced" },
      signature,
    }, { provisionExecWallet: async () => "0xexecAddr" });
    expect(res.ok).toBe(true);
    expect(res.ok === true && res.execAddress).toBe("0xexecAddr");
  });
});
