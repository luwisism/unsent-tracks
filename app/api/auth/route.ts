import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

const AUTH_USER_SELECT = {
  id: true,
  username: true,
  badge: true,
  monogramColor: true,
  tags: true,
  archetype: true,
  coordinates: true,
  frequency: true,
  bio: true,
  anthemTrackId: true,
  anthemTrackName: true,
  anthemArtist: true,
  anthemAlbumArt: true,
  anthemPreview: true,
  pinnedNoteId: true,
  isSuspended: true,
  suspendedReason: true,
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      mode,
      username,
      passcode,
      monogramColor,
      tags,
      coordinates,
      frequency,
      bio,
    } = body;

    const cleanHandle = String(username || "")
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9._-]/g, "");

    if (!cleanHandle || cleanHandle.length < 2) {
      return NextResponse.json(
        { error: "Handle must be at least 2 characters (letters, numbers, ., _, -)." },
        { status: 400 }
      );
    }

    if (!passcode || String(passcode).trim().length < 4) {
      return NextResponse.json(
        { error: "Passcode must be at least 4 characters." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username: cleanHandle },
      select: { ...AUTH_USER_SELECT, passcode: true },
    });

    if (mode === "register") {
      const regLocked = await prisma.systemSetting.findUnique({
        where: { key: "registration_locked" },
      });
      if (regLocked?.value === "true") {
        return NextResponse.json(
          { error: "New handle registration is temporarily closed by administration." },
          { status: 403 }
        );
      }

      if (existing) {
        return NextResponse.json(
          { error: `Handle @${cleanHandle} is already taken. Switch to Sign In.` },
          { status: 409 }
        );
      }

      const cleanTags = String(tags || "LISTENER").trim();
      const user = await prisma.user.create({
        data: {
          username: cleanHandle,
          passcode: String(passcode),
          monogramColor: monogramColor || "#111111",
          tags: cleanTags,
          archetype: cleanTags.split(",")[0]?.trim() || "LISTENER",
          coordinates: coordinates || "00.0000° N, 00.0000° E",
          frequency: frequency || "02:00 AM",
          bio: bio ? String(bio).trim() : "",
        },
        select: AUTH_USER_SELECT,
      });

      return NextResponse.json({ user }, { status: 201 });
    }

    if (!existing) {
      return NextResponse.json(
        { error: `Handle @${cleanHandle} not found. Switch to Create Handle.` },
        { status: 404 }
      );
    }

    if (existing.isSuspended) {
      return NextResponse.json(
        { error: existing.suspendedReason || "This account has been suspended." },
        { status: 403 }
      );
    }

    if (existing.passcode !== String(passcode)) {
      return NextResponse.json(
        { error: "Incorrect passcode for this handle." },
        { status: 401 }
      );
    }

    const { passcode: _p, ...safeUser } = existing;
    return NextResponse.json({ user: safeUser });
  } catch {
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
