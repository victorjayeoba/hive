import { describe, it, expect } from "vitest";
import { sweepAmount } from "../sweep.js";

describe("earnings sweep", () => {
  const reserve = 5_000_000_000_000_000n; // 0.005 gas reserve
  it("sweeps nothing below reserve", () => {
    expect(sweepAmount(reserve, reserve)).toBe(0n);
    expect(sweepAmount(reserve - 1n, reserve)).toBe(0n);
  });
  it("sweeps balance minus reserve above threshold", () => {
    const bal = reserve + 10_000_000_000_000_000n;
    expect(sweepAmount(bal, reserve)).toBe(bal - reserve);
  });
});
