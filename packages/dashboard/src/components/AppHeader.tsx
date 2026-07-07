"use client";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

// Compact connect control styled to match the header buttons, wrapping
// RainbowKit's modal logic via ConnectButton.Custom.
function WalletButton() {
  const btn =
    "rounded-sm px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors bg-[var(--amber)] text-[#1a1206] hover:bg-[#ffd787]";
  const ghost =
    "rounded-sm border border-[var(--line)] px-3 py-1.5 text-xs font-mono text-[var(--text-dim)] whitespace-nowrap hover:border-[var(--line-strong)] hover:text-[var(--text)]";
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        if (!ready) return <div className="h-[30px] w-[112px] rounded-sm bg-[var(--panel)]/40" aria-hidden />;
        if (!connected) {
          return (
            <button type="button" onClick={openConnectModal} className={btn}>
              Connect Wallet
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button type="button" onClick={openChainModal} className={`${btn} bg-red-500 text-white hover:bg-red-400`}>
              Wrong network
            </button>
          );
        }
        return (
          <button type="button" onClick={openAccountModal} className={ghost}>
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

const TG_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/usehive_bot";
const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "";

export function AppHeader({ liveBlock }: { liveBlock?: number }) {
  const [copied, setCopied] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bee.png" alt="Hive" className="w-7 h-7" />
          <span className="text-lg font-semibold">Hive</span>
          {/* block ticker hidden on small screens so the buttons fit on one row */}
          {liveBlock != null && (
            <span className="ml-2 hidden font-mono text-[11px] text-[var(--text-faint)] sm:inline">
              block <span className="text-[var(--amber)]">#{liveBlock}</span>
            </span>
          )}
        </Link>
        <div className="flex flex-nowrap items-center justify-end gap-2 sm:gap-3">
          <a href={TG_URL} target="_blank" rel="noreferrer" className="hidden sm:inline-flex text-xs px-2 py-1.5 rounded-sm border border-[var(--line)]">Telegram</a>
          <button
            onClick={() => { navigator.clipboard.writeText(MCP_URL); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="hidden md:inline-flex text-xs px-2 py-1.5 rounded-sm border border-[var(--line)]"
          >{copied ? "copied ✓" : "Add to Claude"}</button>
          {/* Secondary: outlined so it doesn't compete with the primary Connect CTA. */}
          <Link
            href="/app/create"
            className="rounded-sm border border-[var(--amber)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--amber)] whitespace-nowrap hover:bg-[var(--amber)]/10"
          >
            Create Agent
          </Link>
          {/* RainbowKit modal (many desktop wallets + mobile via WalletConnect),
              rendered custom so it matches the compact header style instead of
              RainbowKit's large default pill. Requires NEXT_PUBLIC_WC_PROJECT_ID. */}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
