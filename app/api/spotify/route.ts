import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const searchRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&media=music&entity=song&limit=6`
    );

    if (!searchRes.ok) {
      return NextResponse.json({ tracks: [] });
    }

    const data = await searchRes.json();

    const tracks =
      data.results?.map((item: { trackId?: number | string; trackName?: string; artistName?: string; artworkUrl100?: string; previewUrl?: string }) => ({
        id: String(item.trackId),
        name: item.trackName,
        artist: item.artistName,
        albumArt: item.artworkUrl100?.replace("100x100", "400x400") || "",
        previewUrl: item.previewUrl || "",
      })) || [];

    return NextResponse.json({ tracks });
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}