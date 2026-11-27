import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

const USER_SELECT = {
  id: true,
  username: true,
  badge: true,
  monogramColor: true,
  archetype: true,
  tags: true,
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const color = (searchParams.get("color") || "").trim();
    const tag = (searchParams.get("tag") || "").trim().toLowerCase();

    const notes = await prisma.note.findMany({
      where: {
        isHidden: false,
        AND: [
          color && color !== "ALL" ? { moodColor: color } : {},
          q
            ? {
                OR: [
                  { recipient: { contains: q, mode: "insensitive" } },
                  { message: { contains: q, mode: "insensitive" } },
                  { trackName: { contains: q, mode: "insensitive" } },
                  { artistName: { contains: q, mode: "insensitive" } },
                  { lyricExcerpt: { contains: q, mode: "insensitive" } },
                  { user: { is: { username: { contains: q, mode: "insensitive" } } } },
                ],
              }
            : {},
          tag && tag !== "ALL"
            ? {
                user: {
                  is: {
                    OR: [
                      { tags: { contains: tag, mode: "insensitive" } },
                      { archetype: { contains: tag, mode: "insensitive" } },
                    ],
                  },
                },
              }
            : {},
        ],
      },
      include: {
        reactions: { select: { id: true, type: true, userId: true } },
        replies: { orderBy: { createdAt: "asc" } },
        user: { select: USER_SELECT },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    });

    const allNotesMeta = await prisma.note.findMany({
      where: { isHidden: false },
      select: {
        moodColor: true,
        user: { select: { tags: true, archetype: true } },
      },
    });

    const tagCounts = new Map<string, number>();
    for (const item of allNotesMeta) {
      const raw = [item.user?.tags || "", item.user?.archetype || ""].join(",");
      const parts = raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      for (const p of new Set(parts)) {
        tagCounts.set(p, (tagCounts.get(p) || 0) + 1);
      }
    }

    const trendingTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const storyUsersRaw = await prisma.user.findMany({
      where: {
        isSuspended: false,
        notes: {
          some: {
            createdAt: { gte: yesterday },
            passcode: null,
            isHidden: false,
          },
        },
      },
      select: {
        id: true,
        username: true,
        badge: true,
        monogramColor: true,
        archetype: true,
        tags: true,
        notes: {
          where: { createdAt: { gte: yesterday }, passcode: null, isHidden: false },
          include: {
            reactions: { select: { id: true, type: true } },
            replies: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const formattedNotes = notes.map((n) => {
      const { passcode, ...rest } = n;
      return {
        ...rest,
        isPasscodeProtected: Boolean(passcode),
      };
    });

    return NextResponse.json({
      notes: formattedNotes,
      trendingTags,
      storyUsers: storyUsersRaw.map((u) => ({
        ...u,
        notes: u.notes.map((sn) => {
          const { passcode, ...sRest } = sn;
          return { ...sRest, isPasscodeProtected: Boolean(passcode) };
        }),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load transmissions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const postingLocked = await prisma.systemSetting.findUnique({
      where: { key: "posting_locked" },
    });
    if (postingLocked?.value === "true") {
      return NextResponse.json(
        { error: "New transmissions are temporarily paused by archive administration." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      recipient,
      message,
      moodColor,
      track,
      lyricExcerpt,
      syncedLyrics,
      clipStart,
      clipEnd,
      unlockAt,
      passcode,
      passcodeHint,
      maxListens,
      userId,
    } = body;

    if (!recipient?.trim() || !message?.trim() || !track?.name || !track?.artist) {
      return NextResponse.json(
        { error: "Recipient, message, and a selected song are required." },
        { status: 400 }
      );
    }

    if (userId) {
      const author = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { isSuspended: true, suspendedReason: true },
      });
      if (author?.isSuspended) {
        return NextResponse.json(
          { error: author.suspendedReason || "This account is currently suspended." },
          { status: 403 }
        );
      }
    }

    const created = await prisma.note.create({
      data: {
        recipient: recipient.trim(),
        message: message.trim(),
        moodColor: moodColor || "#111111",
        trackId: String(track.id || ""),
        trackName: String(track.name),
        artistName: String(track.artist),
        albumArt: String(track.albumArt || ""),
        previewUrl: track.previewUrl ? String(track.previewUrl) : null,
        lyricExcerpt: lyricExcerpt?.trim() || null,
        syncedLyrics: syncedLyrics ? String(syncedLyrics) : null,
        clipStart: Number.isFinite(Number(clipStart)) ? Math.max(0, Number(clipStart)) : 0,
        clipEnd: Number.isFinite(Number(clipEnd)) ? Math.max(5, Number(clipEnd)) : 30,
        unlockAt: unlockAt ? new Date(unlockAt) : null,
        passcode: passcode && String(passcode).trim() ? String(passcode).trim() : null,
        passcodeHint: passcodeHint && String(passcodeHint).trim() ? String(passcodeHint).trim() : null,
        maxListens: maxListens && Number(maxListens) > 0 ? Number(maxListens) : null,
        userId: userId ? Number(userId) : null,
      },
      include: {
        reactions: { select: { id: true, type: true } },
        replies: { orderBy: { createdAt: "asc" } },
        user: { select: USER_SELECT },
      },
    });

    const { passcode: _p, ...safeNote } = created;
    return NextResponse.json(
      { ...safeNote, isPasscodeProtected: Boolean(created.passcode) },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to publish transmission." }, { status: 500 });
  }
}
