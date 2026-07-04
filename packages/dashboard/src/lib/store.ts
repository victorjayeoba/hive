import { create } from "zustand";
import type { Snapshot } from "./types";

// Live marketplace state, pushed from the indexer WebSocket. TanStack Query does
// the initial HTTP fetch; the socket keeps this store current thereafter.
interface HiveStore {
  snapshot: Snapshot | null;
  connected: boolean;
  setSnapshot: (s: Snapshot) => void;
  setConnected: (c: boolean) => void;
}

export const useHiveStore = create<HiveStore>((set) => ({
  snapshot: null,
  connected: false,
  setSnapshot: (snapshot) => set({ snapshot }),
  setConnected: (connected) => set({ connected }),
}));
