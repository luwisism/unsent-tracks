import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      notes: {
        include: {
          reactions: { select: { id: true, type: true } },
          replies: true,
        },
        orderBy: { createdAt: "desc" },
      },
      following: {
        include: {
          following: { select: { id: true, username: true } },
        },
      },
      followers: {
        include: {
          follower: { select: { id: true, username: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { passcode: _p, ...safeUser } = user;
  return NextResponse.json(safeUser);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await request.json();

    const cleanTags = Array.isArray(body.tags)
      ? body.tags
          .map((t: string) => t.trim().toUpperCase())
          .filter(Boolean)
          .slice(0, 4)
          .join(", ")
      : typeof body.tags === "string"
      ? body.tags.trim().toUpperCase()
      : undefined;

    const updated = await prisma.user.update({
      where: { username },
      data: {
        monogramColor: body.monogramColor,
        bio: body.bio,
        tags: cleanTags,
        archetype: cleanTags ? cleanTags.split(",")[0]?.trim() || "LISTENER" : undefined,
        frequency: body.frequency,
        coordinates: body.coordinates,
        anthemTrackId: body.anthemTrackId,
        anthemTrackName: body.anthemTrackName,
        anthemArtist: body.anthemArtist,
        anthemAlbumArt: body.anthemAlbumArt,
        anthemPreview: body.anthemPreview,
        ...(body.pinnedNoteId !== undefined ? { pinnedNoteId: body.pinnedNoteId } : {}),
      },
    });

    const { passcode: _p, ...safeUser } = updated;
    return NextResponse.json(safeUser);
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
