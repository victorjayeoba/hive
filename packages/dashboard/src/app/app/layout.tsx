"use client";
import { useEffect, useState, type ReactNode } from "react";

// The /app segment is the live, wallet-connected dashboard: every page here uses
// wagmi + TanStack Query hooks (useAccount/useConnect/useQuery via the live
// snapshot). Those hooks can't run during Next's static prerender pass — there's
// no QueryClient/WagmiProvider context there — so it throws "No QueryClient set".
//
// Gating children behind a mount flag makes this segment client-only: nothing
// under /app renders (and no wallet hook runs) until we're in the browser. There
// is no SEO cost — this is an authenticated app shell, not a landing page.
export default function AppLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}
