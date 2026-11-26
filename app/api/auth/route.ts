import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function POST(request: Request) {
  try {
    const {
      mode,
      username,
      passcode,
      monogramColor,
      tags,
      coordinates,
      frequency,
      bio,
      anthemTrackId,
      anthemTrackName,
      anthemArtist,
      anthemAlbumArt,
      anthemPreview,
    } = await request.json();

    const cleanHandle = String(username || "")
      .trim()
      .replace(/^@/, "")
      .replace(/\s+/g, "_");

    if (!cleanHandle || !passcode) {
      return NextResponse.json(
        { error: "Handle and passcode are required." },
        { status: 400 }
      );
    }

    if (mode === "register") {
      const existing = await prisma.user.findUnique({
        where: { username: cleanHandle },
      });
      if (existing) {
        return NextResponse.json(
          { error: "That handle is already claimed." },
          { status: 409 }
        );
      }

      const cleanTags = Array.isArray(tags)
        ? tags
            .map((t: string) => t.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, 4)
            .join(", ")
        : typeof tags === "string" && tags.trim()
        ? tags.trim().toUpperCase()
        : "LATE NIGHTS, ARCHIVE";

      const user = await prisma.user.create({
        data: {
          username: cleanHandle,
          passcode: String(passcode),
          monogramColor: monogramColor || "#111111",
          tags: cleanTags,
          archetype: cleanTags.split(",")[0]?.trim() || "LISTENER",
          coordinates: coordinates || "00.0000° N, 00.0000° E",
          frequency: frequency || "02:00 AM",
          bio: bio || "",
          anthemTrackId: anthemTrackId || null,
          anthemTrackName: anthemTrackName || null,
          anthemArtist: anthemArtist || null,
          anthemAlbumArt: anthemAlbumArt || null,
          anthemPreview: anthemPreview || null,
        },
      });

      return NextResponse.json({ user }, { status: 201 });
    }

    const user = await prisma.user.findUnique({
      where: { username: cleanHandle },
    });

    if (!user || user.passcode !== String(passcode)) {
      return NextResponse.json(
        { error: "Invalid handle or passcode." },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
