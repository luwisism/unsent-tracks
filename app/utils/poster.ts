import { Note } from "../types/archive";

export function getContrastText(hexColor: string): string {
  const hex = (hexColor || "#FFFFFF").replace("#", "");
  if (hex.length < 6) return "#111111";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? "#111111" : "#FFFFFF";
}

export function getMonogram(username?: string): string {
  if (!username) return "AN";
  return username.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "LN";
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines?: number
): string[] {
  const paragraphs = text.split("\n");
  const allLines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";
    for (let i = 0; i < words.length; i++) {
      // Break ultra-long unbroken strings if needed
      const word = words[i];
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line !== "") {
        allLines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) allLines.push(line);
  }

  if (maxLines && allLines.length > maxLines) {
    const trimmed = allLines.slice(0, maxLines);
    const last = trimmed[maxLines - 1];
    trimmed[maxLines - 1] = last.length > 3 ? `${last.slice(0, -3)}...` : `${last}...`;
    return trimmed;
  }

  return allLines;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function triggerCanvasPngDownload(canvas: HTMLCanvasElement, filename: string) {
  const fallbackDataUrl = () => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (typeof canvas.toBlob === "function") {
    canvas.toBlob((blob) => {
      if (!blob) {
        fallbackDataUrl();
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = blobUrl;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    }, "image/png");
  } else {
    fallbackDataUrl();
  }
}

export async function downloadSwissPoster(note: Note) {
  const canvas = document.createElement("canvas");
  // True 9:16 vertical print ratio (1080 x 1920)
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const fg = getContrastText(note.moodColor);
  const innerLeft = 96;
  const innerRight = 984;
  const safeWidth = innerRight - innerLeft; // 888px strict inner text width

  // 1. Background Surface
  ctx.fillStyle = note.moodColor || "#FFFFFF";
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Outer Swiss Frame & Header Rule
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(48, 48, 984, 1824);

  ctx.beginPath();
  ctx.moveTo(48, 176);
  ctx.lineTo(1032, 176);
  ctx.stroke();

  // 3. Top Index Header
  ctx.fillStyle = fg;
  ctx.font = "bold 24px monospace";
  ctx.fillText("SIDE B // 026 // ARCHIVE PRINT", innerLeft, 124);
  const noLabel = `NO.${String(note.id).padStart(3, "0")}`;
  const noWidth = ctx.measureText(noLabel).width;
  ctx.fillText(noLabel, innerRight - noWidth, 124);

  // 4. Recipient (Wrapped safely inside safeWidth)
  let cursorY = 268;
  ctx.font = "bold 62px Helvetica, Arial, sans-serif";
  const recipientLines = wrapLines(
    ctx,
    `TO: ${note.recipient.toUpperCase()}`,
    safeWidth,
    2
  );
  for (const rLine of recipientLines) {
    ctx.fillText(rLine, innerLeft, cursorY);
    cursorY += 72;
  }

  // 5. Author Handle & Coordinates
  cursorY += 4;
  ctx.font = "bold 22px monospace";
  const authorLabel = note.user ? `BY @${note.user.username.toUpperCase()}` : "BY ANONYMOUS";
  const authorLines = wrapLines(ctx, authorLabel, safeWidth, 1);
  ctx.fillText(authorLines[0] || authorLabel, innerLeft, cursorY);
  cursorY += 76;

  // 6. Main Confession Body (Dynamic sizing based on length so it fits 9:16 cleanly)
  const msgText = `“${note.message}”`;
  const isLongMsg = msgText.length > 260;
  const msgFontSize = isLongMsg ? 40 : 50;
  const msgLineHeight = isLongMsg ? 56 : 68;
  const maxMsgLines = note.lyricExcerpt ? 9 : 13;

  ctx.font = `500 ${msgFontSize}px Helvetica, Arial, sans-serif`;
  const bodyLines = wrapLines(ctx, msgText, safeWidth, maxMsgLines);
  for (const bLine of bodyLines) {
    ctx.fillText(bLine, innerLeft, cursorY);
    cursorY += msgLineHeight;
  }

  // 7. Pinned Lyric Excerpt (Properly word-wrapped inside safeWidth!)
  const soundtrackBoxTop = 1480;
  if (note.lyricExcerpt && cursorY < soundtrackBoxTop - 90) {
    cursorY += 28;

    // Subtle hairline divider above lyrics
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(innerLeft, cursorY);
    ctx.lineTo(innerRight, cursorY);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    cursorY += 44;
    ctx.font = "italic 28px monospace";

    const rawLyricLines = note.lyricExcerpt.split("\n").filter((l) => l.trim());
    for (const rawLine of rawLyricLines) {
      if (cursorY > soundtrackBoxTop - 45) break;
      const wrappedLyric = wrapLines(ctx, `♪ "${rawLine.trim()}"`, safeWidth, 2);
      for (const wLine of wrappedLyric) {
        if (cursorY > soundtrackBoxTop - 45) break;
        ctx.fillText(wLine, innerLeft, cursorY);
        cursorY += 40;
      }
      cursorY += 8;
    }
  }

  // 8. Bottom Soundtrack Specimen Block (Fixed anchor at bottom of 9:16 frame)
  const boxHeight = 240;
  ctx.fillStyle = fg;
  ctx.fillRect(innerLeft, soundtrackBoxTop, safeWidth, boxHeight);

  const inverseBg = note.moodColor || "#FFFFFF";
  const artImg = await loadImage(note.albumArt);
  let textStartX = innerLeft + 36;

  if (artImg) {
    const artSize = 168;
    const artX = innerLeft + 36;
    const artY = soundtrackBoxTop + 36;
    ctx.drawImage(artImg, artX, artY, artSize, artSize);
    ctx.strokeStyle = inverseBg;
    ctx.lineWidth = 3;
    ctx.strokeRect(artX, artY, artSize, artSize);
    textStartX = artX + artSize + 32;
  }

  const cardTextMaxWidth = innerRight - textStartX - 32;
  ctx.fillStyle = inverseBg;
  ctx.font = "bold 20px monospace";
  ctx.fillText("ATTACHED SOUNDTRACK // 30S ARCHIVE", textStartX, soundtrackBoxTop + 68);

  ctx.font = "bold 36px Helvetica, Arial, sans-serif";
  const trackLines = wrapLines(ctx, note.trackName, cardTextMaxWidth, 1);
  ctx.fillText(trackLines[0] || note.trackName, textStartX, soundtrackBoxTop + 124);

  ctx.font = "28px Helvetica, Arial, sans-serif";
  const artistLines = wrapLines(ctx, note.artistName, cardTextMaxWidth, 1);
  ctx.fillText(artistLines[0] || note.artistName, textStartX, soundtrackBoxTop + 168);

  // 9. Swiss Barcode Footer
  ctx.fillStyle = fg;
  for (let i = 0; i < 42; i++) {
    const barWidth = i % 3 === 0 ? 8 : 3;
    ctx.fillRect(innerLeft + i * 21, 1775, barWidth, 48);
  }

  triggerCanvasPngDownload(canvas, `side-b-${String(note.id).padStart(3, "0")}.png`);
}

export function formatIndex(id: number): string {
  return String(id).padStart(3, "0");
}

export function formatCountdown(unlockAt: string | Date, nowTick: number): string {
  const diff = Math.max(0, new Date(unlockAt).getTime() - nowTick);
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function downloadSwissProfilePoster(
  profile: {
    username: string;
    monogramColor: string;
    bio?: string;
    archetype?: string;
    tags?: string;
    frequency?: string;
    frequencyHour?: string;
    coordinates?: string;
    anthemTrackName?: string | null;
    anthemArtist?: string | null;
    anthemArtistName?: string | null;
    anthemAlbumArt?: string | null;
  },
  stats: { notesCount: number; followersCount: number; followingCount: number },
  pinnedNote?: Note | null
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bg = profile.monogramColor || "#111111";
  const fg = getContrastText(bg);
  const innerLeft = 96;
  const innerRight = 984;
  const safeWidth = innerRight - innerLeft;

  // 1. Background Surface in User's Chosen Color
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Outer Swiss Frame & Header Divider
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(48, 48, 984, 1824);

  ctx.beginPath();
  ctx.moveTo(48, 176);
  ctx.lineTo(1032, 176);
  ctx.stroke();

  // 3. Top Header
  ctx.fillStyle = fg;
  ctx.font = "bold 24px monospace";
  ctx.fillText("SIDE B // 026 // IDENTITY CARD", innerLeft, 124);
  const freqLabel = (profile.frequency || profile.frequencyHour || "02:00 AM").toUpperCase();
  const freqW = ctx.measureText(freqLabel).width;
  ctx.fillText(freqLabel, innerRight - freqW, 124);

  // 4. Monogram Stamp + Handle
  ctx.strokeStyle = fg;
  ctx.lineWidth = 5;
  ctx.strokeRect(innerLeft, 224, 152, 152);
  ctx.font = "bold 62px monospace";
  const mono = getMonogram(profile.username);
  const monoW = ctx.measureText(mono).width;
  ctx.fillText(mono, innerLeft + (152 - monoW) / 2, 322);

  const handleLeft = innerLeft + 184;
  const handleMaxW = innerRight - handleLeft;
  ctx.font = "bold 56px Helvetica, Arial, sans-serif";
  const handleLines = wrapLines(ctx, `@${profile.username}`, handleMaxW, 1);
  ctx.fillText(handleLines[0] || `@${profile.username}`, handleLeft, 290);

  ctx.font = "bold 22px monospace";
  const coordText = `LOC // ${(profile.coordinates || "UNLISTED FREQUENCY").toUpperCase()}`;
  const coordLines = wrapLines(ctx, coordText, handleMaxW, 1);
  ctx.fillText(coordLines[0] || coordText, handleLeft, 336);

  const tagStr = (profile.tags || profile.archetype || "ARCHIVE")
    .split(",")
    .map((t) => `#${t.trim().toUpperCase()}`)
    .filter((t) => t !== "#")
    .slice(0, 3)
    .join("  ");
  ctx.fillText(tagStr, handleLeft, 372);

  // 5. Bio
  let cursorY = 460;
  if (profile.bio) {
    ctx.font = "500 38px Helvetica, Arial, sans-serif";
    const bioLines = wrapLines(ctx, profile.bio, safeWidth, 4);
    for (const line of bioLines) {
      ctx.fillText(line, innerLeft, cursorY);
      cursorY += 52;
    }
    cursorY += 20;
  }

  // 6. Compact Stats Strip
  ctx.strokeStyle = fg;
  ctx.lineWidth = 3;
  ctx.strokeRect(innerLeft, cursorY, safeWidth, 84);
  ctx.font = "bold 24px monospace";
  const statLine = `ARCHIVED: ${stats.notesCount}   //   FOLLOWERS: ${stats.followersCount}   //   FOLLOWING: ${stats.followingCount}`;
  ctx.fillText(statLine, innerLeft + 32, cursorY + 51);
  cursorY += 130;

  // 7. Pinned Note Showcase (if pinned)
  if (pinnedNote) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = fg;
    ctx.fillRect(innerLeft, cursorY, safeWidth, 270);
    ctx.restore();

    ctx.strokeStyle = fg;
    ctx.lineWidth = 3;
    ctx.strokeRect(innerLeft, cursorY, safeWidth, 270);

    ctx.fillStyle = fg;
    ctx.font = "bold 20px monospace";
    ctx.fillText(
      `PINNED TRANSMISSION // NO.${String(pinnedNote.id).padStart(3, "0")} → TO: ${pinnedNote.recipient.toUpperCase()}`,
      innerLeft + 28,
      cursorY + 46
    );

    ctx.font = "500 32px Helvetica, Arial, sans-serif";
    const pinLines = wrapLines(ctx, `“${pinnedNote.message}”`, safeWidth - 56, 3);
    let pinY = cursorY + 98;
    for (const pl of pinLines) {
      ctx.fillText(pl, innerLeft + 28, pinY);
      pinY += 42;
    }

    ctx.font = "bold 20px monospace";
    ctx.fillText(
      `♪ ${pinnedNote.trackName} — ${pinnedNote.artistName}`,
      innerLeft + 28,
      cursorY + 242
    );
    cursorY += 310;
  }

  // 8. Profile Anthem Block
  const anthemName = profile.anthemTrackName;
  const anthemArtist = profile.anthemArtist || profile.anthemArtistName || "";
  if (anthemName) {
    const anthemTop = Math.max(cursorY, 1180);
    ctx.fillStyle = fg;
    ctx.fillRect(innerLeft, anthemTop, safeWidth, 180);

    const artImg = await loadImage(profile.anthemAlbumArt || "");
    let textX = innerLeft + 28;
    if (artImg) {
      ctx.drawImage(artImg, innerLeft + 24, anthemTop + 24, 132, 132);
      textX = innerLeft + 180;
    }
    const maxAnthemW = innerRight - textX - 24;
    ctx.fillStyle = bg;
    ctx.font = "bold 18px monospace";
    ctx.fillText("SIGNATURE PROFILE ANTHEM", textX, anthemTop + 56);
    ctx.font = "bold 32px Helvetica, Arial, sans-serif";
    ctx.fillText(wrapLines(ctx, anthemName, maxAnthemW, 1)[0] || anthemName, textX, anthemTop + 102);
    ctx.font = "24px Helvetica, Arial, sans-serif";
    ctx.fillText(wrapLines(ctx, anthemArtist, maxAnthemW, 1)[0] || anthemArtist, textX, anthemTop + 140);
  }

  // 9. Scannable QR Code Block (Bottom)
  const profileUrl = `${window.location.origin}/?u=${encodeURIComponent(profile.username)}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    profileUrl
  )}`;
  const qrImg = await loadImage(qrApiUrl);

  const qrBoxTop = 1440;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  ctx.strokeRect(innerLeft, qrBoxTop, safeWidth, 300);

  if (qrImg) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(innerLeft + 24, qrBoxTop + 20, 260, 260);
    ctx.drawImage(qrImg, innerLeft + 24, qrBoxTop + 20, 260, 260);
  }

  const qrTextX = innerLeft + 312;
  ctx.fillStyle = fg;
  ctx.font = "bold 22px monospace";
  ctx.fillText("SCAN TO TUNE IN & FOLLOW", qrTextX, qrBoxTop + 76);

  ctx.font = "bold 40px Helvetica, Arial, sans-serif";
  ctx.fillText(`@${profile.username}`, qrTextX, qrBoxTop + 132);

  ctx.font = "bold 18px monospace";
  ctx.fillText("SIDE B ARCHIVE // VERIFIED FREQUENCY", qrTextX, qrBoxTop + 264);

  // 10. Swiss Barcode Footer
  ctx.fillStyle = fg;
  for (let i = 0; i < 42; i++) {
    const barWidth = i % 3 === 0 ? 8 : 3;
    ctx.fillRect(innerLeft + i * 21, 1785, barWidth, 44);
  }

  triggerCanvasPngDownload(canvas, `side-b-profile-${profile.username}.png`);
}
