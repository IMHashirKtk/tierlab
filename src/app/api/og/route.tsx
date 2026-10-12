import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title") || "Community Tier List";
    const author = searchParams.get("author") || "TierLab Creator";
    const category = searchParams.get("category") || "Tier List";
    const topTier = searchParams.get("topTier") || "S";
    const topItemsRaw = searchParams.get("topItems") || "";
    const totalRanked = searchParams.get("totalRanked") || "";
    const mode = searchParams.get("mode") || "ranking";

    const topItems = topItemsRaw
      ? topItemsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3)
      : [];

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#09090b",
            backgroundImage:
              "radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.18) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(168, 85, 247, 0.18) 0%, transparent 45%)",
            padding: "54px 60px",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: "#f4f4f5",
          }}
        >
          {/* Top Header Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: 900,
                }}
              >
                ⚡
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    letterSpacing: "-0.5px",
                    color: "#ffffff",
                  }}
                >
                  TIER
                </span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 900,
                    letterSpacing: "-0.5px",
                    background: "linear-gradient(135deg, #818cf8 0%, #c084fc 100%)",
                    backgroundClip: "text",
                    color: "#a855f7",
                  }}
                >
                  LAB
                </span>
                <span
                  style={{
                    marginLeft: "6px",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(99, 102, 241, 0.2)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#a5b4fc",
                    letterSpacing: "0.5px",
                  }}
                >
                  .APP
                </span>
              </div>
            </div>

            {/* Mode & Category Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span
                style={{
                  padding: "6px 16px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(24, 24, 27, 0.9)",
                  border: "1px solid rgba(63, 63, 70, 0.8)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#a1a1aa",
                }}
              >
                {category}
              </span>
              <span
                style={{
                  padding: "6px 16px",
                  borderRadius: "9999px",
                  background:
                    mode === "versus"
                      ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(249, 115, 22, 0.25) 100%)"
                      : "linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)",
                  border:
                    mode === "versus"
                      ? "1px solid rgba(239, 68, 68, 0.5)"
                      : "1px solid rgba(99, 102, 241, 0.5)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: mode === "versus" ? "#f87171" : "#c084fc",
                }}
              >
                {mode === "versus" ? "⚔️ HEAD-TO-HEAD DUEL" : "🔥 COMMUNITY RANKING"}
              </span>
            </div>
          </div>

          {/* Center Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              marginTop: "20px",
              marginBottom: "20px",
            }}
          >
            {/* Title */}
            <div
              style={{
                fontSize: title.length > 36 ? "46px" : "54px",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-1.5px",
                color: "#ffffff",
                display: "-webkit-box",
                textOverflow: "ellipsis",
                overflow: "hidden",
                maxHeight: "135px",
              }}
            >
              {title}
            </div>

            {/* Author Attribution */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "20px",
                color: "#a1a1aa",
              }}
            >
              <span>Ranked by</span>
              <span
                style={{
                  color: "#ffffff",
                  fontWeight: 700,
                  background: "rgba(39, 39, 42, 0.8)",
                  padding: "4px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(63, 63, 70, 0.8)",
                }}
              >
                @{author}
              </span>
              {totalRanked ? (
                <>
                  <span style={{ color: "#52525b" }}>•</span>
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>{totalRanked}</span>
                </>
              ) : null}
            </div>

            {/* Top S-Tier Highlights preview */}
            {topItems.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "10px",
                  padding: "16px 20px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(18, 18, 22, 0.85)",
                  border: "1px solid rgba(39, 39, 42, 0.9)",
                }}
              >
                <div
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                    color: "#ffffff",
                    fontSize: "18px",
                    fontWeight: 900,
                    letterSpacing: "0.5px",
                    boxShadow: "0 4px 12px rgba(244, 63, 94, 0.4)",
                  }}
                >
                  {topTier}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  {topItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(39, 39, 42, 0.9)",
                        border: "1px solid rgba(63, 63, 70, 0.8)",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#e4e4e7",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>🏆</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Bottom Footer Callout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              paddingTop: "20px",
              borderTop: "1px solid rgba(39, 39, 42, 0.8)",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#71717a",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⚔️ Compare, Duel & Remix this Tier List at</span>
              <span style={{ color: "#a5b4fc", fontWeight: 700 }}>tierlab.app</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#c084fc",
                backgroundColor: "rgba(168, 85, 247, 0.12)",
                padding: "8px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(168, 85, 247, 0.3)",
              }}
            >
              <span>Click to view ranking & duel →</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    if (e?.digest?.startsWith?.("NEXT_") || e?.message?.includes?.("NEXT_PRERENDER_INTERRUPTED")) {
      throw e;
    }
    console.error("OG Image generation failed", e);
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}
