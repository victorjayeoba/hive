"use client";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useState } from "react";

const TG_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/usehive_bot";
const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "";

export function AppHeader({ liveBlock }: { liveBlock?: number }) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bee.png" alt="Hive" className="w-7 h-7" />
          <span className="text-lg font-semibold">Hive</span>
          {liveBlock != null && (
            <span className="ml-2 font-mono text-[11px] text-[var(--text-faint)]">
              block <span className="text-[var(--amber)]">#{liveBlock}</span>
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <a href={TG_URL} target="_blank" rel="noreferrer" className="text-xs px-2 py-1.5 rounded-sm border border-[var(--line)]">Telegram</a>
          <button
            onClick={() => { navigator.clipboard.writeText(MCP_URL); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="text-xs px-2 py-1.5 rounded-sm border border-[var(--line)]"
          >{copied ? "copied ✓" : "Add to Claude"}</button>
          <Link href="/app/create" className="text-xs px-3 py-1.5 rounded-sm bg-[var(--amber)] text-[#1a1206] font-semibold">Create Agent</Link>
          {isConnected ? (
            <button onClick={() => disconnect()} className="text-xs px-2 py-1.5 rounded-sm border border-[var(--line)] font-mono">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </button>
          ) : (
            <button onClick={() => connect({ connector: injected() })} className="text-xs px-3 py-1.5 rounded-sm border border-[var(--amber)] text-[var(--amber)]">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
