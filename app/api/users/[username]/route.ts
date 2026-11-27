import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const clean = username.trim().toLowerCase().replace(/^@+/, "");
    const { searchParams } = new URL(request.url);
    const viewerId = Number(searchParams.get("viewerId") || 0);

    const user = await prisma.user.findUnique({
      where: { username: clean },
      select: {
        id: true,
        username: true,
        badge: true,
        monogramColor: true,
        bio: true,
        archetype: true,
        tags: true,
        frequency: true,
        coordinates: true,
        anthemTrackId: true,
        anthemTrackName: true,
        anthemArtist: true,
        anthemAlbumArt: true,
        anthemPreview: true,
        pinnedNoteId: true,
        isSuspended: true,
        createdAt: true,
        followers: {
          include: {
            follower: {
              select: { id: true, username: true, badge: true, monogramColor: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        following: {
          include: {
            following: {
              select: { id: true, username: true, badge: true, monogramColor: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        notes: {
          where: { isHidden: false },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          include: {
            reactions: { select: { id: true, type: true } },
            replies: { orderBy: { createdAt: "asc" } },
            user: {
              select: { id: true, username: true, badge: true, monogramColor: true, archetype: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const repliedNotesRaw = await prisma.note.findMany({
      where: {
        isHidden: false,
        replies: { some: { senderHandle: user.username } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        reactions: { select: { id: true, type: true } },
        replies: { orderBy: { createdAt: "asc" } },
        user: {
          select: { id: true, username: true, badge: true, monogramColor: true, archetype: true },
        },
      },
    });

    const sanitizeNotes = <T extends { passcode?: string | null }>(list: T[]) =>
      list.map((n) => {
        const { passcode, ...rest } = n;
        return { ...rest, isPasscodeProtected: Boolean(passcode) };
      });

    const sanitizedAuthored = sanitizeNotes(user.notes);
    const { followers, following, ...profileFields } = user;

    return NextResponse.json({
      ...profileFields,
      notes: sanitizedAuthored,
      activity: {
        badge: user.badge,
        followersCount: followers.length,
        followingCount: following.length,
        isFollowing: viewerId ? followers.some((f) => f.followerId === viewerId) : false,
        followers: followers.map((f) => f.follower),
        following: following.map((f) => f.following),
        authoredNotes: sanitizedAuthored,
        repliedNotes: sanitizeNotes(repliedNotesRaw),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const clean = username.trim().toLowerCase().replace(/^@+/, "");
    const body = await request.json();

    const existing = await prisma.user.findUnique({ where: { username: clean } });
    if (!existing) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    if (body.passcode && String(body.passcode) !== existing.passcode) {
      return NextResponse.json({ error: "Passcode verification failed." }, { status: 401 });
    }

    const cleanTags = body.tags !== undefined ? String(body.tags).trim() : existing.tags;
    const updated = await prisma.user.update({
      where: { username: clean },
      data: {
        monogramColor: body.monogramColor ?? existing.monogramColor,
        bio: body.bio !== undefined ? String(body.bio).trim() : existing.bio,
        tags: cleanTags,
        archetype: cleanTags ? cleanTags.split(",")[0]?.trim() || "LISTENER" : existing.archetype,
        frequency: body.frequency ?? existing.frequency,
        coordinates: body.coordinates ?? existing.coordinates,
        anthemTrackId: body.anthemTrackId !== undefined ? body.anthemTrackId : existing.anthemTrackId,
        anthemTrackName:
          body.anthemTrackName !== undefined ? body.anthemTrackName : existing.anthemTrackName,
        anthemArtist: body.anthemArtist !== undefined ? body.anthemArtist : existing.anthemArtist,
        anthemAlbumArt:
          body.anthemAlbumArt !== undefined ? body.anthemAlbumArt : existing.anthemAlbumArt,
        anthemPreview:
          body.anthemPreview !== undefined ? body.anthemPreview : existing.anthemPreview,
        pinnedNoteId: body.pinnedNoteId !== undefined ? body.pinnedNoteId : existing.pinnedNoteId,
      },
      select: {
        id: true,
        username: true,
        badge: true,
        monogramColor: true,
        bio: true,
        archetype: true,
        tags: true,
        frequency: true,
        coordinates: true,
        anthemTrackId: true,
        anthemTrackName: true,
        anthemArtist: true,
        anthemAlbumArt: true,
        anthemPreview: true,
        pinnedNoteId: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
