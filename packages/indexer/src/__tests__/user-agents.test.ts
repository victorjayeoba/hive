import { describe, it, expect, beforeEach } from "vitest";
import { insertUserAgent, listUserAgents, getUserAgent, db } from "../db.js";

describe("user_agents registry", () => {
  beforeEach(() => {
    db.exec("DELETE FROM user_agents");
  });

  it("inserts and reads back an agent", () => {
    insertUserAgent({
      execAddress: "0xexec",
      name: "RiskBot",
      systemPrompt: "You assess wallet risk.",
      ownerAddress: "0xowner",
      payoutAddress: "0xpayout",
      taskTypes: ["wallet-risk"],
      bidStrategy: { type: "balanced" },
      createdSig: "0xsig",
    });
    const a = getUserAgent("0xexec");
    expect(a?.name).toBe("RiskBot");
    expect(a?.taskTypes).toEqual(["wallet-risk"]);
    expect(a?.status).toBe("active");
    expect(listUserAgents()).toHaveLength(1);
  });
});
