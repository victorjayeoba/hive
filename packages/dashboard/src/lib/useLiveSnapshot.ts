"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHiveStore } from "./store";
import { INDEXER_HTTP } from "./indexer";
import type { Snapshot } from "./types";

const INDEXER_WS = process.env.NEXT_PUBLIC_INDEXER_WS ?? "ws://localhost:4000";

// Initial fetch via TanStack Query, then keep the Zustand store live via the
// indexer's WebSocket. Falls back to polling if the socket drops.
export function useLiveSnapshot() {
  const setSnapshot = useHiveStore((s) => s.setSnapshot);
  const setConnected = useHiveStore((s) => s.setConnected);

  const query = useQuery({
    queryKey: ["snapshot"],
    queryFn: async (): Promise<Snapshot> => {
      const res = await fetch(`${INDEXER_HTTP}/snapshot`);
      if (!res.ok) throw new Error("indexer unreachable");
      return res.json();
    },
    refetchInterval: (q) => (useHiveStore.getState().connected ? false : 2000),
  });

  useEffect(() => {
    if (query.data) setSnapshot(query.data);
  }, [query.data, setSnapshot]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;

    function connect() {
      ws = new WebSocket(INDEXER_WS);
      ws.onopen = () => setConnected(true);
      ws.onmessage = (ev) => {
        try { setSnapshot(JSON.parse(ev.data) as Snapshot); } catch { /* ignore */ }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) setTimeout(connect, 1500);
      };
      ws.onerror = () => ws?.close();
    }
    connect();

    return () => { closed = true; ws?.close(); };
  }, [setSnapshot, setConnected]);

  return query;
}
