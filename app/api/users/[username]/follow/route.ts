import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const body = await req.json();
    const followerId = Number(body.followerId);

    if (!followerId) {
      return NextResponse.json({ error: "Sign in to follow users." }, { status: 401 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { username: decodeURIComponent(username) },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (targetUser.id === followerId) {
      return NextResponse.json({ error: "Cannot follow yourself." }, { status: 400 });
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUser.id,
        },
      },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false });
    } else {
      await prisma.follow.create({
        data: {
          followerId,
          followingId: targetUser.id,
        },
      });

      await prisma.activity.create({
        data: {
          userId: followerId,
          type: "FOLLOWED",
          summary: `Started following @${targetUser.username}`,
          target: targetUser.username,
        },
      });

      return NextResponse.json({ following: true });
    }
  } catch (err) {
    console.error("Follow toggle error:", err);
    return NextResponse.json({ error: "Failed to update follow status." }, { status: 500 });
  }
}
