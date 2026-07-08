"use client";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

// Brand glyphs as inline SVG (no icon-font dependency, exact size/color control).
function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
      <path d="M11.94 2.02c-5.5 0-9.96 4.46-9.96 9.96s4.46 9.96 9.96 9.96 9.96-4.46 9.96-9.96S17.44 2.02 11.94 2.02Zm4.62 6.83-1.54 7.28c-.12.52-.42.65-.85.4l-2.35-1.73-1.13 1.09c-.13.13-.24.24-.48.24l.17-2.4 4.37-3.95c.19-.17-.04-.26-.3-.09L9.2 12.94l-2.33-.73c-.5-.16-.51-.5.11-.75l9.1-3.51c.42-.15.79.1.65.72Z" />
    </svg>
  );
}

// Claude/Anthropic "sunburst" mark.
function ClaudeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M4.7 15.6 8.5 13.5l.06-.18-.06-.1H8.3l-.62-.04-2.12-.06-1.84-.08-1.78-.1-.45-.1L1 12.2l.04-.28.38-.25.54.04 1.2.08 1.8.12 1.3.08 1.93.2h.3l.05-.12-.1-.08-.08-.07-1.86-1.26-2.02-1.34-1.05-.77-.57-.39-.29-.36-.12-.8.52-.57.7.05.18.05.71.55 1.52 1.18 1.99 1.46.29.24.12-.08.02-.06-.13-.22-1.08-1.96-1.16-2-.52-.83-.13-.5a2.4 2.4 0 0 1-.09-.6l.6-.8.32-.11.8.11.34.29.5 1.14.8 1.8 1.26 2.45.37.73.2.67.07.2h.13v-.11l.1-1.4.19-1.72.19-2.22.06-.62.3-.73.6-.4.46.23.39.55-.05.36-.23 1.5-.46 2.37-.3 1.59h.18l.2-.2.82-1.1 1.38-1.72.6-.68.72-.76.46-.36h.87l.64.95-.29.98-.9 1.13-.73.96-1.06 1.42-.66 1.14.06.1.16-.02 2.4-.5 1.3-.24 1.55-.26.7.32.08.34-.28.68-1.66.41-1.95.4-2.9.68-.03.03.04.04 1.3.13.56.03h1.37l2.55.19.66.44.4.54-.07.4-1.02.53-1.38-.33-3.22-.77-1.1-.27h-.16v.09l.92.9 1.69 1.52 2.1 1.96.11.49-.27.38-.29-.04-1.86-1.4-.72-.63-1.62-1.37h-.11v.14l.38.55 1.98 2.97.1.91-.15.3-.5.17-.56-.1-1.15-1.6-1.18-1.82-.96-1.62-.11.07-.57 6.1-.26.31-.61.24-.51-.39-.27-.62.27-1.24.32-1.61.26-1.28.24-1.6.14-.52-.01-.04h-.11l-1.15 1.58-1.75 2.36-1.38 1.48-.33.13-.58-.3.05-.53.32-.48 1.94-2.46 1.17-1.53.75-.88-.01-.13h-.05L5.8 17.42l-1.16.15-.5-.47.06-.77.24-.25 1.96-1.35Z" />
    </svg>
  );
}

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
        const connected = mounted && account && chain;
        // Always render a REAL, tappable button — never a dead placeholder div.
        // Before mount, openConnectModal is a no-op but the button still exists, so
        // a mobile tap the instant after hydration works (the earlier version
        // rendered a non-interactive div until `mounted`, which read as "nothing
        // happens on tap" on slower mobile hydration).
        if (!connected) {
          return (
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className={btn}
              style={{ opacity: mounted ? 1 : 0.6 }}
            >
              Connect Wallet
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button type="button" onClick={() => openChainModal?.()} className={`${btn} bg-red-500 text-white hover:bg-red-400`}>
              Wrong network
            </button>
          );
        }
        return (
          <button type="button" onClick={() => openAccountModal?.()} className={ghost}>
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
  const [showClaude, setShowClaude] = useState(false);

  return (
    <>
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
        <div className="flex flex-nowrap items-center justify-end gap-2 sm:gap-2.5">
          {/* Compact icon buttons — visible on ALL screens (mobile included) so the
              two other front doors, Telegram + Claude/MCP, are always reachable. */}
          <a
            href={TG_URL}
            target="_blank"
            rel="noreferrer"
            title="Message the Hive Telegram bot"
            aria-label="Telegram"
            className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-sm border border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
          >
            <TelegramIcon />
          </a>
          <button
            onClick={() => setShowClaude(true)}
            title="Connect Hive to Claude (MCP)"
            aria-label="Add to Claude"
            className="inline-flex h-[30px] items-center gap-1.5 rounded-sm border border-[var(--line)] px-2 text-[var(--text-dim)] hover:border-[var(--line-strong)] hover:text-[var(--text)]"
          >
            <ClaudeIcon />
            <span className="hidden text-[11px] sm:inline">Claude</span>
          </button>
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
    {/* Rendered OUTSIDE the sticky header so its z-index isn't trapped in the
        header's stacking context (which made the popup appear behind the page). */}
    {showClaude && <ClaudeConnectModal onClose={() => setShowClaude(false)} />}
    </>
  );
}

// "Connect to Claude" popup: the MCP URL to copy + brief steps to add it as a
// custom connector in Claude / Cursor. No fragile deep-link — just copy + paste.
function ClaudeConnectModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = MCP_URL || "set NEXT_PUBLIC_MCP_URL";
  const CLAUDE_CONNECTORS = "https://claude.ai/new#settings/customize-connectors";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mt-2 w-full max-w-md rounded-md border border-[var(--line-strong)] bg-[var(--panel)] p-5 text-[var(--text)] shadow-2xl sm:mt-6"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-sm px-2 py-0.5 font-mono text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--amber)]"
        >
          ✕
        </button>

        <div className="mb-1 flex items-center gap-2">
          <ClaudeIcon />
          <h2 className="text-lg font-semibold">Connect Hive to Claude</h2>
        </div>
        <p className="mb-4 text-xs text-[var(--text-dim)]">
          Add Hive&apos;s MCP server and Claude (or Cursor) gains 18 BOT Chain tools — wallet risk,
          tx decoding, money-flow tracing, live chain stats — plus the power to hire the market.
        </p>

        {/* Copyable URL */}
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--text-faint)]">
          MCP server URL
        </label>
        <div className="mb-4 flex items-stretch gap-2">
          <code className="min-w-0 flex-1 truncate rounded-sm border border-[var(--line)] bg-black/30 px-2 py-2 font-mono text-xs text-[var(--text-dim)]">
            {url}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="shrink-0 rounded-sm bg-[var(--amber)] px-3 text-xs font-semibold text-[#1a1206] hover:bg-[#ffd787]"
          >
            {copied ? "copied ✓" : "Copy"}
          </button>
        </div>

        {/* Steps */}
        <ol className="mb-4 space-y-2 text-sm text-[var(--text-dim)]">
          <li><span className="text-[var(--amber)]">1.</span> Copy the URL above.</li>
          <li><span className="text-[var(--amber)]">2.</span> In Claude, open <span className="text-[var(--text)]">Settings → Connectors → Add custom connector</span> (or use the button below).</li>
          <li><span className="text-[var(--amber)]">3.</span> Paste the URL and add it.</li>
          <li><span className="text-[var(--amber)]">4.</span> Ask Claude: <span className="text-[var(--text)]">&ldquo;What&apos;s the BOT Chain network pulse?&rdquo;</span> — it&apos;ll call a Hive tool.</li>
        </ol>

        <a
          href={CLAUDE_CONNECTORS}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-sm border border-[var(--line-strong)] py-2 text-center text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)] hover:text-[var(--amber)]"
        >
          Open Claude connector settings ↗
        </a>
        <p className="mt-2 text-center text-[10px] text-[var(--text-faint)]">
          Works in Claude Desktop, claude.ai, and Cursor.
        </p>
      </div>
    </div>
  );
}
