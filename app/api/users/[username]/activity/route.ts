import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const viewerId = Number(req.nextUrl.searchParams.get("viewerId") || 0);

    const user = await prisma.user.findUnique({
      where: { username: decodeURIComponent(username) },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
        followers: {
          include: {
            follower: {
              select: { id: true, username: true, monogramColor: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        following: {
          include: {
            following: {
              select: { id: true, username: true, monogramColor: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 40,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            recipient: true,
            trackName: true,
            artistName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userReplies = await prisma.songReply.findMany({
      where: { senderHandle: user.username },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        note: { select: { id: true, recipient: true } },
      },
    });

    const isFollowing = viewerId
      ? user.followers.some((f) => f.followerId === viewerId)
      : false;

    const explicitFeed = user.activities.map((a) => ({
      id: `act-${a.id}`,
      type: a.type,
      summary: a.summary,
      noteId: a.noteId,
      target: a.target,
      createdAt: a.createdAt,
    }));

    const noteFeed = user.notes.map((n) => ({
      id: `note-${n.id}`,
      type: "POSTED",
      summary: `Archived note to ${n.recipient} paired with “${n.trackName}”`,
      noteId: n.id,
      target: null,
      createdAt: n.createdAt,
    }));

    const replyFeed = userReplies.map((r) => ({
      id: `rep-${r.id}`,
      type: "REPLIED",
      summary: `Replied with “${r.trackName}” on note to ${r.note?.recipient || "Archive"}`,
      noteId: r.noteId,
      target: null,
      createdAt: r.createdAt,
    }));

    const existingNoteEvents = new Set(
      explicitFeed
        .filter((e) => e.noteId && (e.type === "POSTED" || e.type === "REPLIED"))
        .map((e) => `${e.type}-${e.noteId}`)
    );

    const combined = [
      ...explicitFeed,
      ...noteFeed.filter((n) => !existingNoteEvents.has(`POSTED-${n.noteId}`)),
      ...replyFeed.filter((r) => !existingNoteEvents.has(`REPLIED-${r.noteId}`)),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      followersCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing,
      followers: Array.from(new Map(user.followers.map((f) => [f.follower.id, f.follower])).values()),
      following: Array.from(new Map(user.following.map((f) => [f.following.id, f.following])).values()),
      activities: combined.slice(0, 40),
    });
  } catch (err) {
    console.error("Activity fetch error:", err);
    return NextResponse.json({ error: "Failed to load activity." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await req.json();
    const user = await prisma.user.findUnique({
      where: { username: decodeURIComponent(username) },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const created = await prisma.activity.create({
      data: {
        userId: user.id,
        type: String(body.type || "UPDATED_PROFILE"),
        summary: String(body.summary || "Updated archive record"),
        noteId: body.noteId ? Number(body.noteId) : null,
        target: body.target ? String(body.target) : null,
      },
    });

    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: "Failed to log activity" }, { status: 500 });
  }
}
