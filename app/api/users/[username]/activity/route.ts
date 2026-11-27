import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

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
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const [authoredNotes, repliedNotes] = await Promise.all([
      prisma.note.findMany({
        where: { userId: user.id, isHidden: false },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 30,
        include: {
          reactions: { select: { id: true, type: true } },
          replies: { orderBy: { createdAt: "asc" } },
          user: {
            select: { id: true, username: true, badge: true, monogramColor: true, archetype: true },
          },
        },
      }),
      prisma.note.findMany({
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
      }),
    ]);

    const sanitize = (list: typeof authoredNotes) =>
      list.map((n) => {
        const { passcode, ...rest } = n;
        return { ...rest, isPasscodeProtected: Boolean(passcode) };
      });

    return NextResponse.json({
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowing: viewerId ? user.followers.some((f) => f.followerId === viewerId) : false,
      followers: user.followers.map((f) => f.follower),
      following: user.following.map((f) => f.following),
      authoredNotes: sanitize(authoredNotes),
      repliedNotes: sanitize(repliedNotes),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load user activity." }, { status: 500 });
  }
}
