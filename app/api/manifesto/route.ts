import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

const VALID_REACTIONS = ["RESONATES", "NEW_TRACK", "FREE_SPACE", "CO_SIGN"];
const VALID_CATEGORIES = ["COMMENT", "SUGGESTION", "BUG"];

function serializeComments(
  raw: Array<{
    id: number;
    category: string;
    authorHandle: string;
    message: string;
    teamStatus: string | null;
    createdAt: Date;
    reactions: Array<{ type: string }>;
  }>
) {
  return raw.map((c) => {
    const heartCount = c.reactions.filter((r) => r.type === "HEART").length;
    const plusOneCount = c.reactions.filter((r) => r.type === "PLUS_ONE").length;
    return {
      id: c.id,
      category: c.category,
      authorHandle: c.authorHandle,
      message: c.message,
      teamStatus: c.teamStatus,
      createdAt: c.createdAt,
      stampCounts: { HEART: heartCount, PLUS_ONE: plusOneCount },
    };
  });
}

export async function GET() {
  try {
    const [reactionGroups, comments] = await Promise.all([
      prisma.manifestoReaction.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
      prisma.manifestoComment.findMany({
        orderBy: { createdAt: "desc" },
        take: 120,
        include: { reactions: { select: { type: true } } },
      }),
    ]);

    const counts: Record<string, number> = {
      RESONATES: 0,
      NEW_TRACK: 0,
      FREE_SPACE: 0,
      CO_SIGN: 0,
    };
    for (const row of reactionGroups) {
      counts[row.type] = row._count.type;
    }

    return NextResponse.json({ counts, comments: serializeComments(comments) });
  } catch (error) {
    console.error("GET /api/manifesto error:", error);
    return NextResponse.json(
      { counts: { RESONATES: 0, NEW_TRACK: 0, FREE_SPACE: 0, CO_SIGN: 0 }, comments: [] },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "react") {
      const type = String(body.type || "").toUpperCase();
      const visitorId = String(body.visitorId || "").slice(0, 80);
      if (!VALID_REACTIONS.includes(type) || !visitorId) {
        return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
      }

      const existing = await prisma.manifestoReaction.findUnique({
        where: { type_visitorId: { type, visitorId } },
      });

      let active = false;
      if (existing) {
        await prisma.manifestoReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.manifestoReaction.create({ data: { type, visitorId } });
        active = true;
      }

      const total = await prisma.manifestoReaction.count({ where: { type } });
      return NextResponse.json({ type, active, count: total });
    }

    if (body.action === "comment") {
      const category = VALID_CATEGORIES.includes(String(body.category || "").toUpperCase())
        ? String(body.category).toUpperCase()
        : "COMMENT";
      const message = String(body.message || "").trim();
      const rawHandle = String(body.authorHandle || "").trim();
      const authorHandle = rawHandle
        ? (rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`).slice(0, 32)
        : "ANONYMOUS";

      if (!message || message.length > 600) {
        return NextResponse.json(
          { error: "Message must be between 1 and 600 characters" },
          { status: 400 }
        );
      }

      const created = await prisma.manifestoComment.create({
        data: {
          category,
          authorHandle,
          message,
        },
        include: { reactions: { select: { type: true } } },
      });

      return NextResponse.json({ comment: serializeComments([created])[0] }, { status: 201 });
    }

    if (body.action === "stamp_comment") {
      const commentId = Number(body.commentId || 0);
      const stampType = String(body.stampType || "").toUpperCase();
      const visitorId = String(body.visitorId || "").slice(0, 80);
      const actorHandle = String(body.actorHandle || "SOMEONE").replace(/^@+/, "").trim() || "SOMEONE";

      if (!commentId || !["HEART", "PLUS_ONE"].includes(stampType) || !visitorId) {
        return NextResponse.json({ error: "Invalid comment stamp" }, { status: 400 });
      }

      const target = await prisma.manifestoComment.findUnique({ where: { id: commentId } });
      if (!target) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }

      const existing = await prisma.manifestoCommentReaction.findUnique({
        where: { commentId_type_visitorId: { commentId, type: stampType, visitorId } },
      });

      let active = false;
      if (existing) {
        await prisma.manifestoCommentReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.manifestoCommentReaction.create({
          data: { commentId, type: stampType, visitorId },
        });
        active = true;

        if (target.authorHandle && target.authorHandle !== "ANONYMOUS") {
          const clean = target.authorHandle.replace(/^@+/, "").toLowerCase();
          if (clean !== actorHandle.toLowerCase()) {
            const user = await prisma.user.findUnique({
              where: { username: clean },
              select: { id: true },
            });
            if (user) {
              await prisma.notification.create({
                data: {
                  userId: user.id,
                  type: "COMMENT_STAMP",
                  actorHandle,
                  message: `stamped ${stampType === "HEART" ? "♥" : "+1"} on your LINER // 00 post`,
                },
              });
            }
          }
        }
      }

      const [hearts, plusOnes] = await Promise.all([
        prisma.manifestoCommentReaction.count({ where: { commentId, type: "HEART" } }),
        prisma.manifestoCommentReaction.count({ where: { commentId, type: "PLUS_ONE" } }),
      ]);

      return NextResponse.json({
        commentId,
        stampType,
        active,
        stampCounts: { HEART: hearts, PLUS_ONE: plusOnes },
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/manifesto error:", error);
    return NextResponse.json({ error: "Failed to process manifesto action" }, { status: 500 });
  }
}
