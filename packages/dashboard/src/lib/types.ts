// Shape of the indexer's /snapshot payload. Kept in sync with @hive/indexer's
// queries.ts snapshot().
export interface Bid {
  worker: string;
  price: string;
  tx_hash: string;
  block: number;
}

export interface Task {
  id: number;
  requester: string;
  worker: string | null;
  max_bounty: string;
  price: string | null;
  status: number;
  spec_hash: string | null;
  result_hash: string | null;
  posted_tx: string | null;
  settled_tx: string | null;
  updated_block: number | null;
  bids: Bid[];
  postedUrl: string | null;
  settledUrl: string | null;
}

export interface Agent {
  address: string;
  completed: number;
  timed_out: number;
  disputed: number;
  earned: string;
}

export interface Counters {
  tasks: number;
  bids: number;
  txs: number;
  settledValue: string;
  settledCount: number;
}

export interface Snapshot {
  tasks: Task[];
  agents: Agent[];
  counters: Counters;
  explorerBase: string;
  nativeSymbol: string;
}
