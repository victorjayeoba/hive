import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db.js";

// Regression: a task was showing ~25 identical bids because the poller used a
// plain INSERT and re-inserted the same BidPlaced event on every indexer restart
// / re-scan. The fix: a UNIQUE index on bids.tx_hash + INSERT OR IGNORE.
describe("bid dedup by tx_hash", () => {
  beforeEach(() => db.exec("DELETE FROM bids"));

  it("ignores a re-inserted bid with the same tx_hash", () => {
    const insert = () =>
      db
        .prepare("INSERT OR IGNORE INTO bids (task_id, worker, price, tx_hash, block) VALUES (?, ?, ?, ?, ?)")
        .run(46, "0x9daa", "500", "0xsamehash", 1);

    insert();
    insert();
    insert(); // three replays of the same on-chain bid

    const rows = db.prepare("SELECT COUNT(*) c FROM bids WHERE tx_hash = ?").get("0xsamehash") as { c: number };
    expect(rows.c).toBe(1);
  });

  it("keeps distinct bids with different tx_hashes", () => {
    db.prepare("INSERT OR IGNORE INTO bids (task_id, worker, price, tx_hash, block) VALUES (?, ?, ?, ?, ?)").run(46, "0xa", "500", "0xtx1", 1);
    db.prepare("INSERT OR IGNORE INTO bids (task_id, worker, price, tx_hash, block) VALUES (?, ?, ?, ?, ?)").run(46, "0xb", "400", "0xtx2", 2);
    const rows = db.prepare("SELECT COUNT(*) c FROM bids").get() as { c: number };
    expect(rows.c).toBe(2);
  });
});
