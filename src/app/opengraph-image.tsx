import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt =
  "Sohum Systems — federal technology, digital modernization. SBA 8(a), CMMI Level 3.";
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
          <svg width="86" height="83" viewBox="0 0 112 108">
            <path
              fill="#e8622a"
              d="M108 8C62 8 20 26 12 50 6 68 24 79 50 81 32 75 24 63 31 49 43 27 74 12 108 8Z"
            />
            <path
              fill="#ffffff"
              d="M4 100c46 0 88-18 96-42 6-18-12-29-38-31 18 6 26 18 19 32C69 81 38 96 4 100Z"
            />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff" }}>
              <span>so</span>
              <span style={{ color: "#fa752e" }}>hum</span>
              <span>&nbsp;systems</span>
            </div>
            <div
              style={{
                fontSize: 15,
                letterSpacing: 5,
                color: "#8fa2c4",
                marginTop: 6,
              }}
            >
              FEDERAL TECHNOLOGY
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
            {["SBA 8(a)", "CMMI Level 3", "ISO 27001", "NASA SEWP VI", "CIO-SP3"].map((t) => (
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
