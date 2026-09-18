import { ImageResponse } from "next/og";

export const alt = "PollarBridge — African local rails to Pollar USDC & Bolivian payout";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0A0E1D 0%, #131A38 55%, #0A0E1D 100%)",
          color: "#F8FAFC",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#A78BFA", fontWeight: 600 }}>
          AFRICA → BOLIVIA
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
            PollarBridge
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#94A3B8", maxWidth: 900, lineHeight: 1.4 }}>
            Local bank & mobile-money rails in Africa → operator-verified USDC settlement on Pollar
            → Bolivian payout.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Bank", "Mobile money", "P2P", "Agents", "USDC", "Pollar testnet"].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid #3B4A6B",
                background: "rgba(139, 92, 246, 0.08)",
                color: "#C7D2FE",
                fontSize: 22,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
