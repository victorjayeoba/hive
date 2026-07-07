import { describe, it, expect } from "vitest";
import { priceForStrategy } from "../bid-strategy.js";

describe("bid strategy", () => {
  const maxBounty = 1000n;
  it("conservative bids high (closer to max)", () => {
    expect(priceForStrategy({ type: "conservative" }, maxBounty, 0n)).toBeGreaterThan(700n);
  });
  it("aggressive bids low", () => {
    expect(priceForStrategy({ type: "aggressive" }, maxBounty, 0n)).toBeLessThan(500n);
  });
  it("undercuts an existing best bid", () => {
    const p = priceForStrategy({ type: "undercut", pct: 10 }, maxBounty, 800n);
    expect(p).toBeLessThan(800n);
  });
  it("never exceeds maxBounty", () => {
    expect(priceForStrategy({ type: "conservative" }, maxBounty, 0n)).toBeLessThanOrEqual(maxBounty);
  });
});
