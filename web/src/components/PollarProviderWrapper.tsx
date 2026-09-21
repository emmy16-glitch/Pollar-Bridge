"use client";

import React, { useEffect, useState } from "react";
import { PollarProvider } from "@pollar/react";

// Publishable key is optional at runtime. When empty we SKIP the SDK
// entirely (no config fetch → no 401 in console) and every page renders
// its demo fallback. Never crash the portal because a key is missing.
const apiKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY ?? "";
const hasKey = apiKey !== "";

// Catches a render-time throw from inside the SDK tree (e.g. storage or
// config failure) and falls back to rendering children without the provider.
// The only usePollar() consumer (PollarWalletCard) has its own boundary +
// SSR gate, so provider-less children stay safe.
class PollarMountBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("PollarProvider failed, running in demo fallback:", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function PollarProviderWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // SSR / first paint: render children without the SDK (no window, no storage).
  if (!mounted) return <>{children}</>;
  // No key → skip the SDK completely. Mounting PollarProvider with an empty
  // key fires GET /applications/config → 401 in the console on every page.
  if (!hasKey) return <>{children}</>;
  return (
    <PollarMountBoundary fallback={<>{children}</>}>
      <PollarProvider client={{ apiKey }}>{children}</PollarProvider>
    </PollarMountBoundary>
  );
}
