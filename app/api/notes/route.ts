import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

function sanitizeNote(note: Record<string, unknown>, unlockedIds: Set<number>) {
  const hasPasscode = Boolean(note.passcode);
  const isUnlocked = !hasPasscode || unlockedIds.has(Number(note.id));
  const { passcode: _ignored, ...rest } = note;
  return {
    ...rest,
    isPasscodeProtected: hasPasscode,
    message: isUnlocked ? note.message : "[ENCRYPTED TRANSMISSION — PASSCODE REQUIRED]",
    lyricExcerpt: isUnlocked ? note.lyricExcerpt : null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const color = searchParams.get("color") || "";
  const tag = searchParams.get("tag") || searchParams.get("archetype") || "";
  const idParam = searchParams.get("id");
  const unlockedParam = searchParams.get("unlocked") || "";

  const unlockedIds = new Set(
    unlockedParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0)
  );

  const notes = await prisma.note.findMany({
    where: {
      AND: [
        idParam ? { id: Number(idParam) } : {},
        search
          ? {
              OR: [
                { recipient: { contains: search } },
                { message: { contains: search } },
                { trackName: { contains: search } },
                { artistName: { contains: search } },
                { lyricExcerpt: { contains: search } },
                { user: { username: { contains: search } } },
                { user: { tags: { contains: search } } },
              ],
            }
          : {},
        color ? { moodColor: { equals: color } } : {},
        tag
          ? {
              user: {
                OR: [{ tags: { contains: tag } }, { archetype: { contains: tag } }],
              },
            }
          : {},
      ],
    },
    include: {
      reactions: { select: { id: true, type: true, userId: true } },
      replies: { orderBy: { createdAt: "asc" } },
      user: {
        select: {
          id: true,
          username: true,
          monogramColor: true,
          archetype: true,
          tags: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Collect all distinct surface colors & user tags across the archive
  const allNotesMeta = await prisma.note.findMany({
    select: {
      moodColor: true,
      user: { select: { tags: true, archetype: true } },
    },
  });

  const colorSet = new Set<string>();
  const tagCounts = new Map<string, number>();

  for (const item of allNotesMeta) {
    if (item.moodColor) colorSet.add(item.moodColor.toUpperCase());
    const rawTags = item.user?.tags || item.user?.archetype || "";
    rawTags
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .forEach((t) => {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      });
  }

  const availableTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeStoryUsers = await prisma.user.findMany({
    where: {
      notes: { some: { createdAt: { gte: yesterday }, passcode: null } },
    },
    select: {
      id: true,
      username: true,
      monogramColor: true,
      archetype: true,
      tags: true,
      notes: {
        where: { createdAt: { gte: yesterday }, passcode: null },
        include: {
          reactions: { select: { id: true, type: true } },
          replies: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({
    notes: notes.map((n) => sanitizeNote(n as unknown as Record<string, unknown>, unlockedIds)),
    stories: activeStoryUsers,
    availableColors: Array.from(colorSet),
    availableTags,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      recipient,
      message,
      moodColor,
      track,
      userId,
      lyricExcerpt,
      clipStart,
      clipEnd,
      unlockAt,
      passcode,
      passcodeHint,
      maxListens,
    } = body;

    if (!recipient || !message || !track) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newNote = await prisma.note.create({
      data: {
        recipient,
        message,
        moodColor: (moodColor || "#FFFFFF").toUpperCase(),
        trackId: track.id,
        trackName: track.name,
        artistName: track.artist,
        albumArt: track.albumArt || "",
        previewUrl: track.previewUrl || null,
        lyricExcerpt: lyricExcerpt || null,
        clipStart: typeof clipStart === "number" ? clipStart : 0,
        clipEnd: typeof clipEnd === "number" ? clipEnd : 30,
        unlockAt: unlockAt ? new Date(unlockAt) : null,
        passcode: passcode && passcode.trim() ? passcode.trim() : null,
        passcodeHint: passcodeHint && passcodeHint.trim() ? passcodeHint.trim() : null,
        maxListens: maxListens && Number(maxListens) > 0 ? Number(maxListens) : null,
        userId: userId ? Number(userId) : null,
      },
      include: {
        reactions: { select: { id: true, type: true } },
        replies: { orderBy: { createdAt: "asc" } },
        user: {
          select: {
            id: true,
            username: true,
            monogramColor: true,
            archetype: true,
            tags: true,
          },
        },
      },
    });

    const { passcode: _p, ...safeNote } = newNote;
    return NextResponse.json(
      { ...safeNote, isPasscodeProtected: Boolean(newNote.passcode) },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
