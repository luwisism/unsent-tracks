import { NextResponse } from "next/server";

interface LrcLine {
  time: number;
  text: string;
}

function normalizeForPreview(lines: LrcLine[]): LrcLine[] {
  if (lines.length === 0) return [];
  // iTunes previews are 30s clips (often starting around the first verse or chorus).
  // If the song's lyrics start or sit past 30s, anchor the window so lines scroll across 0–30s.
  const firstVocal = lines[0].time;
  if (firstVocal > 28) {
    // Pick a rich middle cluster (chorus area) or shift from first vocal
    const anchorIdx = lines.length > 12 ? Math.floor(lines.length * 0.25) : 0;
    const baseOffset = lines[anchorIdx].time;
    return lines
      .slice(anchorIdx)
      .map((l) => ({
        time: Math.max(0, Number((l.time - baseOffset).toFixed(2))),
        text: l.text,
      }))
      .filter((l) => l.time <= 30);
  }
  return lines;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const track = searchParams.get("track") || "";
  const artist = searchParams.get("artist") || "";

  if (!track) {
    return NextResponse.json({ lines: [], synced: [] });
  }

  try {
    const res = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(
        track
      )}&artist_name=${encodeURIComponent(artist)}`,
      { headers: { "User-Agent": "LinerNotes026/1.0" } }
    );
    const data = await res.json();
    const match = Array.isArray(data)
      ? data.find((d) => d.syncedLyrics || d.plainLyrics)
      : null;

    if (!match) {
      return NextResponse.json({ lines: [], synced: [] });
    }

    const rawSynced: LrcLine[] = [];
    if (match.syncedLyrics) {
      for (const raw of match.syncedLyrics.split("\n")) {
        const m = raw.match(/^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)$/);
        if (m && m[3].trim()) {
          rawSynced.push({
            time: parseInt(m[1], 10) * 60 + parseFloat(m[2]),
            text: m[3].trim(),
          });
        }
      }
    }

    const synced = normalizeForPreview(rawSynced);

    const rawText = match.plainLyrics || match.syncedLyrics || "";
    const lines = rawText
      .split("\n")
      .map((l: string) => l.replace(/\[\d{2}:\d{2}(?:\.\d+)?\]/g, "").trim())
      .filter((l: string) => l.length > 0 && !l.startsWith("["));

    return NextResponse.json({ lines, synced });
  } catch {
    return NextResponse.json({ lines: [], synced: [] });
  }
}
