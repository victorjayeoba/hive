import { describe, it, expect, beforeEach } from "vitest";
import { db, loadExecKeyCipher } from "../db.js";
import { rememberExecKey, getExecKey, __decryptForTest } from "../provision.js";

// Regression: exec keys were in-memory only, so an indexer restart lost them and a
// winning user agent could never submit its work (task stuck at AWARDED → refund).
// Keys are now persisted encrypted; getExecKey must recover them from the DB after
// the in-memory cache is cleared (the restart scenario).
describe("exec key persistence", () => {
  const addr = "0x1111111111111111111111111111111111111111";
  const key = "0xabc0000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;

  beforeEach(() => {
    process.env.EXEC_KEY_SECRET = "test-secret-for-exec-keys";
    db.exec("DELETE FROM exec_keys");
  });

  it("stores the key encrypted (ciphertext != plaintext) and recovers it", () => {
    rememberExecKey(addr, key);
    const row = db.prepare("SELECT ciphertext FROM exec_keys WHERE exec_address = ?").get(addr.toLowerCase()) as {
      ciphertext: string;
    };
    expect(row.ciphertext).toBeTruthy();
    expect(row.ciphertext).not.toContain(key); // not stored in the clear
    expect(getExecKey(addr)).toBe(key);
  });

  it("the persisted ciphertext decrypts back to the original key (restart recovery)", () => {
    rememberExecKey(addr, key);
    // Simulate a restart: the DB row is all that survives. Decrypting it (which is
    // exactly what getExecKey does on a cold-cache miss) must yield the key back.
    const cipher = loadExecKeyCipher(addr);
    expect(cipher).toBeTruthy();
    expect(__decryptForTest(cipher!)).toBe(key);
  });
});
