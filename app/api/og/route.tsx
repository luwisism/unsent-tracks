import { ImageResponse } from "next/og";
import { prisma } from "@/app/lib/prisma";

export const alt = "SIDE B // 026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getContrast(hexColor: string): string {
  const hex = (hexColor || "#F4F4F0").replace("#", "");
  if (hex.length < 6) return "#111111";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? "#111111" : "#FFFFFF";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usernameParam = (searchParams.get("u") || "").trim().toLowerCase().replace(/^@+/, "");
  const noteId = Number(searchParams.get("note") || 0);
  const mixtapeId = Number(searchParams.get("mixtape") || 0);

  let bg = "#F4F4F0";
  let fg = "#111111";
  let topLeft = "SIDE B // 026 // ARCHIVE";
  let topRight = "02:00 AM FREQUENCY";
  let badgeText = "";
  let headline = "SIDE B // 026";
  let subheadline = "An editorial archive of unsent transmissions, synced lyrics, mixtapes, and 24-hour frequencies.";
  let footerLeftLabel = "PUBLIC TRANSMISSION TERMINAL";
  let footerLeftValue = "SIDEB.BCKN.SOFTWARE";

  try {
    if (usernameParam) {
      const user = await prisma.user.findUnique({
        where: { username: usernameParam },
        select: {
          username: true,
          badge: true,
          monogramColor: true,
          bio: true,
          archetype: true,
          frequency: true,
          _count: { select: { notes: true, followers: true } },
        },
      });
      if (user) {
        bg = user.monogramColor || "#111111";
        fg = getContrast(bg);
        topLeft = "SIDE B // 026 // IDENTITY CARD";
        topRight = (user.frequency || "02:00 AM").toUpperCase();
        badgeText = (user.badge || "").trim().toUpperCase();
        headline = `@${user.username}`;
        subheadline =
          (user.bio || "").trim() ||
          `${user.archetype || "ARCHIVE"} • ${user._count.notes} TRANSMISSIONS • ${user._count.followers} FOLLOWERS`;
        footerLeftLabel = (user.archetype || "ARCHIVE FREQUENCY").toUpperCase();
        footerLeftValue = `SIDEB.BCKN.SOFTWARE/?U=${user.username.toUpperCase()}`;
      }
    } else if (noteId > 0) {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
        select: {
          id: true,
          recipient: true,
          message: true,
          moodColor: true,
          trackName: true,
          artistName: true,
          isHidden: true,
          passcode: true,
          user: { select: { username: true, badge: true } },
        },
      });
      if (note && !note.isHidden) {
        bg = note.moodColor || "#F4F4F0";
        fg = getContrast(bg);
        topLeft = note.user
          ? `BY @${note.user.username.toUpperCase()}`
          : "BY ANONYMOUS";
        topRight = `NO. ${String(note.id).padStart(3, "0")}`;
        badgeText = (note.user?.badge || "").trim().toUpperCase();
        headline = `TO: ${note.recipient.toUpperCase()}`;
        subheadline = note.passcode
          ? "[ ENCRYPTED TRANSMISSION — PASSCODE REQUIRED TO UNSEAL ]"
          : `“${note.message.slice(0, 150)}${note.message.length > 150 ? "…" : ""}”`;
        footerLeftLabel = "PINNED SOUNDTRACK";
        footerLeftValue = `${note.trackName} — ${note.artistName}`.toUpperCase().slice(0, 48);
      }
    } else if (mixtapeId > 0) {
      const mixtape = await prisma.mixtape.findUnique({
        where: { id: mixtapeId },
        select: {
          id: true,
          title: true,
          subtitle: true,
          coverColor: true,
          creatorName: true,
          user: { select: { username: true, badge: true } },
          _count: { select: { items: true } },
        },
      });
      if (mixtape) {
        bg = mixtape.coverColor || "#111111";
        fg = getContrast(bg);
        topLeft = "SIDE B // 026 // CURATED MIXTAPE";
        topRight = `${mixtape._count.items} TRACKS`;
        badgeText = (mixtape.user?.badge || "").trim().toUpperCase();
        headline = mixtape.title.toUpperCase();
        subheadline =
          (mixtape.subtitle || "").trim() ||
          `Curated archive tape by ${mixtape.user ? `@${mixtape.user.username}` : mixtape.creatorName}`;
        footerLeftLabel = "CURATOR";
        footerLeftValue = (
          mixtape.user ? `@${mixtape.user.username}` : mixtape.creatorName
        ).toUpperCase();
      }
    }
  } catch {
    // Fallback cleanly to default SIDE B card if DB query fails
  }

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
          backgroundColor: bg,
          color: fg,
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
            border: `4px solid ${fg}`,
            padding: "42px 50px",
          }}
        >
          {/* Top Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: `3px solid ${fg}`,
              paddingBottom: "20px",
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
              <span>{topLeft}</span>
              {badgeText ? (
                <span
                  style={{
                    backgroundColor: "#E11D2A",
                    color: "#FFFFFF",
                    padding: "4px 12px",
                    fontSize: "15px",
                    letterSpacing: "0.12em",
                  }}
                >
                  ◉ {badgeText}
                </span>
              ) : null}
            </div>
            <span>{topRight}</span>
          </div>

          {/* Center Headline + Subheadline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div
              style={{
                fontSize: headline.length > 22 ? "62px" : "84px",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1.02,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 500,
                opacity: 0.9,
                maxWidth: "960px",
                lineHeight: 1.35,
              }}
            >
              {subheadline}
            </div>
          </div>

          {/* Bottom Metadata + Swiss Barcode */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderTop: `3px solid ${fg}`,
              paddingTop: "20px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  opacity: 0.72,
                }}
              >
                {footerLeftLabel}
              </span>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                {footerLeftValue}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "40px" }}>
              {bars.map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${w}px`,
                    height: "40px",
                    backgroundColor: fg,
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
