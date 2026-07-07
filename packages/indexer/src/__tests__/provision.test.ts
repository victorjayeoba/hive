import { describe, it, expect } from "vitest";
import { generateExecWallet } from "../provision.js";

describe("provisioning", () => {
  it("generates a fresh exec wallet with an address and key", () => {
    const w = generateExecWallet();
    expect(w.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(w.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("generates unique wallets", () => {
    expect(generateExecWallet().address).not.toBe(generateExecWallet().address);
  });
});
