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
  name: string;
  role: "user-agent" | "worker" | "requester";
  completed: number;
  timedOut: number;
  disputed: number;
  earned: string;
  reliability: number;
  liveStatus: string;
  owner?: string;
  payout?: string;
}

export interface UserAgentConfig {
  execAddress: string;
  name: string;
  systemPrompt: string;
  ownerAddress: string;
  payoutAddress: string;
  taskTypes: string[];
  bidStrategy: Record<string, unknown>;
  status: string;
  createdAt: number;
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
