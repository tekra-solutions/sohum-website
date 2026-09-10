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
          <svg width="72" height="70" viewBox="286 0 301 292">
            <path
              fill="#f25806"
              d="m428.93,0c-30.41,8.17-142.92,63.88-142.38,116.97,0,58.55,115.04,50.4,143.46,46.7,0,0-14.78-3.13-14.78-19.7s14.78-20.65,14.78-20.65c-30.39-1.79-84.63,6.87-86.35-35.62,0-44.48,79.59-79.3,85.26-87.7Z"
            />
            <path
              fill="#8fa2c4"
              d="m432.65,16.92c-27.2,6.3-63.51,29.24-73.6,56.14-5.03,13.42.9,28.44,14,34.25,22.23,9.85,58.24,5.64,58.24,5.64,0,0-6.46-1.34-6.63-10.42-.17-9.21,6.9-9.07,6.9-9.07-6.25-1.61-46.02,4.6-45.95-22.2.81-27,39.59-48.8,47.03-54.34Z"
            />
            <circle fill="#8fa2c4" cx="435" cy="143.06" r="10.11" />
            <path
              fill="#8fa2c4"
              d="m444.59,286.98c30.41-8.17,142.92-63.88,142.38-116.97,0-58.55-115.04-50.4-143.46-46.7,0,0,14.78,3.13,14.78,19.7s-14.78,20.65-14.78,20.65c30.39,1.79,84.63-6.87,86.35,35.62,0,44.48-79.59,79.3-85.26,87.7Z"
            />
            <path
              fill="#f25806"
              d="m440.87,270.06c27.2-6.3,63.51-29.24,73.6-56.14,5.03-13.42-.9-28.44-14-34.25-22.23-9.85-58.24-5.64-58.24-5.64,0,0,6.46,1.34,6.63,10.42.17,9.21-6.9,9.07-6.9,9.07,6.25,1.61,46.02-4.6,45.95,22.2-.81,27-39.59,48.8-47.03,54.34Z"
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
