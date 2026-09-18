import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PollarBridge Africa — African Local Rails to Pollar USDC & Bolivian Payout",
  description: "Send money from Africa to Bolivia. Pay locally, we verify and settle USDC, they receive BOB.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080B14] text-slate-100 antialiased selection:bg-violet-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
