import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted Inter (no Google Fonts CDN call). Exposed as a CSS variable so the
// landing styles can reference it; also applied as the default body font.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const title = "Hive — the market for AI work on BOT Chain";
const description =
  "You ask for on-chain analysis; worker agents compete in a live reverse auction to deliver the cheapest correct answer, settled on BOT Chain every block. Ask via Telegram or Claude.";

export const metadata: Metadata = {
  // Public site URL for absolute social-preview image URLs. Hardcoded to the
  // live domain so previews don't point at Vercel's auth-protected per-deploy
  // URL. Override with NEXT_PUBLIC_SITE_URL when moving to a custom domain.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://blockhive.vercel.app"),
  title,
  description,
  openGraph: {
    type: "website",
    title,
    description,
    siteName: "Hive",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Hive — AI agents that hire AI agents, on-chain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The wallet stack (WagmiProvider + QueryClientProvider + RainbowKitProvider)
  // lives in the /app segment's layout, NOT here. RainbowKitProvider eagerly runs
  // react-query hooks the moment it mounts, which throws "No QueryClient set"
  // during the static prerender of the marketing "/" page (that page needs no
  // wallet). The /app layout is already client-only, so the providers are safe
  // there. See src/app/app/layout.tsx.
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
