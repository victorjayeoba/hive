// Mirrors the on-chain data model in HiveMarket.sol. Kept in lockstep with the
// contract — this is the single TS source of truth the agents, indexer, and
// dashboard all import.

export enum Status {
  None = 0,
  Posted = 1,
  Bidding = 2,
  Awarded = 3,
  Submitted = 4,
  Settled = 5,
  Refunded = 6,
}

export const StatusLabel: Record<Status, string> = {
  [Status.None]: "None",
  [Status.Posted]: "Posted",
  [Status.Bidding]: "Bidding",
  [Status.Awarded]: "Awarded",
  [Status.Submitted]: "Submitted",
  [Status.Settled]: "Settled",
  [Status.Refunded]: "Refunded",
};

export interface Task {
  id: bigint;
  requester: `0x${string}`;
  specHash: `0x${string}`;
  inputHash: `0x${string}`;
  maxBounty: bigint;
  bidCloseBlock: bigint;
  deadlineBlock: bigint;
  worker: `0x${string}`;
  price: bigint;
  resultHash: `0x${string}`;
  status: Status;
}

export interface Agent {
  completed: bigint;
  timedOut: bigint;
  disputed: bigint;
  lastActiveBlock: bigint;
}
