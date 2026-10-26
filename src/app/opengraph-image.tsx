import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt =
  "Sohum Systems: federal technology and digital modernization. CMMI Level 3.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card, generated from the brand palette so it always matches the site. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(120deg, #0b101c 0%, #101726 55%, #1c273e 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="285.76 -7.51 302 302">
            <path fill="#f25806" d="M428.93 0.00C398.52 8.17 286.01 63.88 286.55 116.97C286.55 175.52 401.59 167.37 430.01 163.66A21.27 21.27 0 0 1 430.01 123.32C399.62 121.53 345.38 130.19 343.66 87.70C343.66 43.22 423.25 8.40 428.93 0.00Z" />
            <path fill="#c9d4ea" d="M432.65 16.92C405.45 23.22 369.14 46.16 359.05 73.06C354.02 86.48 359.95 101.50 373.05 107.31C395.28 117.16 431.29 112.95 431.29 112.95L431.55 93.46C425.30 91.85 385.53 98.06 385.60 71.26C386.41 44.26 425.19 22.46 432.65 16.92Z" />
            <path fill="#c9d4ea" d="M444.59 286.98C475.00 278.81 587.51 223.10 586.97 170.01C586.97 111.46 471.93 119.61 443.51 123.32A21.27 21.27 0 0 1 443.51 163.66C473.90 165.45 528.14 156.79 529.86 199.28C529.86 243.76 450.27 278.58 444.59 286.98Z" />
            <path fill="#f25806" d="M440.87 270.06C468.07 263.76 504.38 240.82 514.47 213.92C519.50 200.50 513.57 185.48 500.47 179.67C478.24 169.82 442.23 174.03 442.23 174.03L441.97 193.52C448.22 195.13 487.99 188.92 487.92 215.72C487.11 242.72 448.33 264.52 440.87 270.06Z" />
            <circle fill="#c9d4ea" cx="436.76" cy="143.49" r="12.3" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff" }}>
              <span style={{ fontWeight: 800, letterSpacing: 2 }}>SOHUM</span>
              <span style={{ fontWeight: 400, letterSpacing: 2 }}>&nbsp;SYSTEMS</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              lineHeight: 1.08,
              color: "#ffffff",
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            We modernize the systems federal missions run on.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
            {["CMMI Level 3", "ISO 27001", "GSA MAS", "SeaPort NxG", "CIO-SP3"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 20,
                  color: "#c9d3e5",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
