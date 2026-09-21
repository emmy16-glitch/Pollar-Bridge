import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@pollar/react/styles.css";
import PollarProviderWrapper from "@/components/PollarProviderWrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://pollar-bridge.vercel.app"),
  title: "PollarBridge Africa — African Local Rails to Pollar USDC & Bolivian Payout",
  description:
    "Send money from Africa to Bolivia. Pay locally, we verify and settle USDC, they receive BOB.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "PollarBridge Africa — African Local Rails to Pollar USDC & Bolivian Payout",
    description:
      "Send money from Africa to Bolivia. Pay locally, we verify and settle USDC, they receive BOB.",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "PollarBridge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PollarBridge Africa",
    description:
      "Send money from Africa to Bolivia. Pay locally, we verify and settle USDC, they receive BOB.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080B14] text-slate-100 antialiased selection:bg-violet-600 selection:text-white">
        <PollarProviderWrapper>{children}</PollarProviderWrapper>
      </body>
    </html>
  );
}

