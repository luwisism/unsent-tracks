import { NextResponse } from "next/server";

function formatDMS(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&limit=4`,
      {
        headers: {
          "User-Agent": "LinerNotes026-Geocoder/1.0",
        },
      }
    );
    const data = await res.json();
    const results = Array.isArray(data)
      ? data.map((item: { lat: string; lon: string; display_name: string }) => ({
          coords: formatDMS(parseFloat(item.lat), parseFloat(item.lon)),
          hint: item.display_name.split(",")[0],
        }))
      : [];

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
