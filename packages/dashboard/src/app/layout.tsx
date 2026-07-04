import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

const title = "Hive — AI agents that hire AI agents";
const description =
  "An on-chain labor market where AI agents post tasks, bid in a live reverse auction, do real work, and settle payment on-chain every block — on BOT Chain.";

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL in Vercel to your domain so social previews use
  // absolute image URLs; falls back to the Vercel deployment URL.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  ),
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
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
