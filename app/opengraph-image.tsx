import { ImageResponse } from "next/og";

export const alt = "SIDE B // 026 — Unsent Notes & Soundtrack Archive";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const bars = [8, 3, 5, 8, 3, 3, 6, 8, 3, 5, 3, 8, 4, 3, 8, 3, 6, 3, 8, 5, 3, 8, 3, 6, 8, 3, 5, 3, 8, 3, 6, 8];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F4F4F0",
          color: "#111111",
          padding: "36px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "4px solid #111111",
            padding: "44px 52px",
          }}
        >
          {/* Top Header Strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "3px solid #111111",
              paddingBottom: "22px",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.14em",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "9999px",
                  backgroundColor: "#E11D2A",
                }}
              />
              <span>SIDE B // 026 // ARCHIVE</span>
            </div>
            <span>02:00 AM FREQUENCY</span>
          </div>

          {/* Center Editorial Block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              marginTop: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "24px",
              }}
            >
              <span
                style={{
                  fontSize: "108px",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  lineHeight: 0.95,
                }}
              >
                SIDE B
              </span>
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: 800,
                  color: "#E11D2A",
                  letterSpacing: "0.04em",
                }}
              >
                // 026
              </span>
            </div>

            <div
              style={{
                fontSize: "30px",
                fontWeight: 500,
                color: "#222222",
                maxWidth: "920px",
                lineHeight: 1.3,
              }}
            >
              An editorial archive of unsent transmissions, synced lyrics, mixtapes, and 24-hour frequencies.
            </div>
          </div>

          {/* Bottom Metadata + Swiss Barcode Strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderTop: "3px solid #111111",
              paddingTop: "22px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  color: "#555555",
                }}
              >
                PUBLIC TRANSMISSION TERMINAL
              </span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                SIDEB.BCKN.SOFTWARE
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "42px" }}>
              {bars.map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${w}px`,
                    height: "42px",
                    backgroundColor: "#111111",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
