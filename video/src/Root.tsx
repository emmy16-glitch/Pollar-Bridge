import React from "react";
import {
  Composition, staticFile, Audio, useCurrentFrame, useVideoConfig,
  interpolate, spring, AbsoluteFill,
} from "remotion";

const NAVY = "#080B14";
const SURFACE = "#0D1324";
const VIOLET = "#8B5CF6";
const MINT = "#10B981";
const AMBER = "#F59E0B";
const WHITE = "#F8FAFC";
const MUTED = "#94A3B8";
const FONT = "sans-serif";

const op = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const Scene1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 700px at 50% 30%, #101733 0%, ${NAVY} 70%)`, justifyContent: "center", alignItems: "center" }}>
      {["Pollar", "Bridge", "Africa"].map((w, i) => {
        const s = spring({ frame: frame - i * 6, fps, config: { damping: 14 } });
        return (
          <span key={i} style={{ fontFamily: FONT, fontWeight: 800, fontSize: 110, margin: "0 18px", color: i === 1 ? VIOLET : WHITE, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`, opacity: s }}>
            {w}
          </span>
        );
      })}
      <div style={{ marginTop: 30, fontFamily: FONT, fontSize: 28, color: MUTED, opacity: op(frame, 24, 40) }}>
        African local rails → Pollar USDC settlement
      </div>
    </AbsoluteFill>
  );
};

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [
    { title: "African leg — MISSING", body: ["Bank · Mobile money · P2P · Agent cash", "Fragmented rails. No Pollar ramp exists.", "So we built it."], c: AMBER, at: 14 },
    { title: "Bolivian leg — exists", body: ["Pollar mainnet Stereum BOB ramp.", "We hand off cleanly —", "final payout honestly mocked."], c: MINT, at: 40 },
  ];
  return (
    <AbsoluteFill style={{ background: NAVY, padding: 80, fontFamily: FONT }}>
      <div style={{ fontSize: 44, fontWeight: 700, color: WHITE, opacity: op(frame, 0, 12) }}>
        The problem: two halves, one missing
      </div>
      <div style={{ display: "flex", gap: 60, marginTop: 70 }}>
        {cards.map((cd, i) => (
          <div key={i} style={{ flex: 1, background: SURFACE, borderRadius: 28, padding: 44, border: `2px solid ${cd.c}44`, opacity: op(frame, cd.at, cd.at + 16), transform: `translateY(${interpolate(op(frame, cd.at, cd.at + 16), [0, 1], [30, 0])}px)` }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: cd.c }}>{cd.title}</div>
            <div style={{ fontSize: 24, color: MUTED, marginTop: 20, lineHeight: 1.5 }}>
              {cd.body[0]}<br />{cd.body[1]}<br /><b style={{ color: WHITE }}>{cd.body[2]}</b>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Scene3AgentRail: React.FC = () => {
  const frame = useCurrentFrame();
  const steps = [
    { t: "POST /api/agent/quote", s: "402 Payment Required — the bill", c: AMBER },
    { t: "pays testnet USDC + memo", s: "PB-AGENT-XXXXXXXX", c: VIOLET },
    { t: "POST /api/agent/transfers", s: "201 Created — real transfer minted", c: MINT },
  ];
  return (
    <AbsoluteFill style={{ background: NAVY, padding: 80, fontFamily: FONT }}>
      <div style={{ fontSize: 44, fontWeight: 700, color: WHITE, opacity: op(frame, 0, 10) }}>
        The differentiator: agents buy the corridor
      </div>
      <div style={{ marginTop: 60 }}>
        {steps.map((st, i) => {
          const o = op(frame, 12 + i * 22, 26 + i * 22);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, background: SURFACE, border: `2px solid ${st.c}55`, borderRadius: 22, padding: "28px 40px", marginBottom: 28, opacity: o, transform: `translateX(${interpolate(o, [0, 1], [-50, 0])}px)` }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: st.c, width: 70 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 30, fontWeight: 700, color: WHITE, fontFamily: "monospace" }}>{st.t}</div>
                <div style={{ fontSize: 24, color: MUTED, marginTop: 6 }}>{st.s}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 26, color: VIOLET, fontWeight: 700, opacity: op(frame, 80, 95) }}>
        No human clicks. One state machine. Two callers. Audited as actor: agent.
      </div>
    </AbsoluteFill>
  );
};

export const Scene4Safety: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    { t: "Detection ≠ verification", s: "no USDC moves until a human confirms", c: AMBER },
    { t: "Settled on Pollar testnet", s: "real SDK, real wallets, real USDC", c: MINT },
    { t: "Honest by design", s: "BOB payout labeled mocked — always", c: VIOLET },
  ];
  return (
    <AbsoluteFill style={{ background: NAVY, padding: 80, fontFamily: FONT }}>
      <div style={{ fontSize: 44, fontWeight: 700, color: WHITE, opacity: op(frame, 0, 10) }}>
        Money safety is not optional
      </div>
      <div style={{ marginTop: 60 }}>
        {items.map((it, i) => {
          const o = op(frame, 14 + i * 20, 28 + i * 20);
          return (
            <div key={i} style={{ marginBottom: 34, opacity: o, transform: `translateY(${interpolate(o, [0, 1], [30, 0])}px)` }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: it.c }}>✓ {it.t}</div>
              <div style={{ fontSize: 24, color: MUTED, marginTop: 6, marginLeft: 40 }}>{it.s}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Scene5Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1000px 600px at 50% 40%, #131A38 0%, ${NAVY} 75%)`, justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 72, fontWeight: 800, color: WHITE, opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})` }}>
        Pollar<span style={{ color: VIOLET }}>Bridge</span>
      </div>
      <div style={{ fontSize: 30, color: MUTED, marginTop: 26, opacity: op(frame, 20, 36) }}>
        One state machine. Two callers. Settled on Pollar.
      </div>
      <div style={{ fontSize: 24, color: VIOLET, marginTop: 40, fontFamily: "monospace", opacity: op(frame, 45, 60) }}>
        pollar-bridge.vercel.app · github.com/emmy16-glitch/Pollar-Bridge
      </div>
    </AbsoluteFill>
  );
};
