import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db.js";
import { buildRoster } from "../queries.js";

describe("agent roster (fixes '2 agents')", () => {
  beforeEach(() => {
    db.exec("DELETE FROM bids; DELETE FROM agents; DELETE FROM user_agents; DELETE FROM tasks");
  });

  it("includes a worker that bid but never settled a job", () => {
    db.prepare("INSERT INTO tasks (id, requester, max_bounty, status) VALUES (1,'0xreq','1000',2)").run();
    db.prepare("INSERT INTO bids (task_id, worker, price, tx_hash, block) VALUES (1,'0xbidderonly','500','0xtx',1)").run();
    const roster = buildRoster();
    const addrs = roster.map((a) => a.address);
    expect(addrs).toContain("0xbidderonly");
    const bidder = roster.find((a) => a.address === "0xbidderonly")!;
    expect(bidder.completed).toBe(0);
    expect(bidder.liveStatus).toBe("bidding #1");
  });
});
