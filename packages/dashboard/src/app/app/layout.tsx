"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Providers } from "../providers";

// The /app segment is the live, wallet-connected dashboard: every page here uses
// wagmi + TanStack Query hooks (useAccount/useConnect/useQuery via the live
// snapshot) plus RainbowKit. Those hooks can't run during Next's static prerender
// pass — there's no QueryClient/WagmiProvider context there — so it throws "No
// QueryClient set".
//
// The wallet providers (WagmiProvider + QueryClientProvider + RainbowKitProvider)
// are mounted HERE rather than in the root layout so the static marketing "/"
// page never pulls in RainbowKit (which eagerly runs react-query on mount and
// would break "/"'s prerender).
//
// Gating children behind a mount flag makes this segment client-only: nothing
// under /app renders (and no wallet hook runs) until we're in the browser. There
// is no SEO cost — this is an authenticated app shell, not a landing page.
export default function AppLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Providers>{children}</Providers>;
}
