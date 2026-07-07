"use client";
import { useEffect, useState } from "react";

// Same default the live-snapshot stream uses — keep them in sync.
export const INDEXER_HTTP = process.env.NEXT_PUBLIC_INDEXER_HTTP ?? "http://localhost:4000";

// The indexer stores task specs as { kind, prompt, input } and results as plain
// strings, both served from GET /content/:hash as { key, value }.
export interface TaskSpecContent {
  kind?: string;
  prompt?: string;
  input?: string;
}

type ContentState<T> = { loading: boolean; value: T | null; notFound: boolean };

// Fetch off-chain content (spec/result) by its on-chain hash. 404 (unknown hash,
// e.g. a not-yet-submitted result) resolves to notFound rather than an error.
export function useContent<T = unknown>(hash: string | null | undefined): ContentState<T> {
  const [state, setState] = useState<ContentState<T>>({ loading: !!hash, value: null, notFound: false });

  useEffect(() => {
    if (!hash) {
      setState({ loading: false, value: null, notFound: false });
      return;
    }
    let alive = true;
    setState({ loading: true, value: null, notFound: false });
    fetch(`${INDEXER_HTTP}/content/${encodeURIComponent(hash)}`)
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 404) {
          setState({ loading: false, value: null, notFound: true });
          return;
        }
        if (!res.ok) throw new Error(`content ${res.status}`);
        const body = (await res.json()) as { key: string; value: T };
        setState({ loading: false, value: body.value, notFound: false });
      })
      .catch(() => {
        if (alive) setState({ loading: false, value: null, notFound: false });
      });
    return () => {
      alive = false;
    };
  }, [hash]);

  return state;
}

// Render any content value (spec object or result string) as readable text.
export function contentToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const v = value as TaskSpecContent;
    if (v.prompt || v.input) {
      return [v.kind && `kind: ${v.kind}`, v.prompt && `prompt: ${v.prompt}`, v.input && `input: ${v.input}`]
        .filter(Boolean)
        .join("\n");
    }
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
