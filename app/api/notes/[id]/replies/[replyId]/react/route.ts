import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const { replyId } = await context.params;
    const rid = Number(replyId);
    if (!Number.isInteger(rid) || rid <= 0) {
      return NextResponse.json({ error: "Invalid reply ID" }, { status: 400 });
    }

    const body = await req.json();
    const type = String(body.type || "").toUpperCase();
    const visitorId = String(body.visitorId || "").slice(0, 80);
    const actorLabel = String(body.actorHandle || "SOMEONE").replace(/^@+/, "").trim() || "SOMEONE";

    if (!["HEART", "PLUS_ONE"].includes(type) || !visitorId) {
      return NextResponse.json({ error: "Invalid stamp payload" }, { status: 400 });
    }

    const reply = await prisma.songReply.findUnique({ where: { id: rid } });
    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    const existing = await prisma.replyReaction.findUnique({
      where: { replyId_type_visitorId: { replyId: rid, type, visitorId } },
    });

    let active = false;
    if (existing) {
      await prisma.replyReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.replyReaction.create({
        data: { replyId: rid, type, visitorId },
      });
      active = true;

      if (reply.senderHandle) {
        const cleanHandle = reply.senderHandle.replace(/^@+/, "").toLowerCase();
        if (cleanHandle !== actorLabel.toLowerCase()) {
          const recipientUser = await prisma.user.findUnique({
            where: { username: cleanHandle },
            select: { id: true },
          });
          if (recipientUser) {
            await prisma.notification.create({
              data: {
                userId: recipientUser.id,
                type: "COMMENT_STAMP",
                actorHandle: actorLabel,
                noteId: reply.noteId,
                message: `stamped ${type === "HEART" ? "♥" : "+1"} on your reply`,
              },
            });
          }
        }
      }
    }

    const [hearts, plusOnes] = await Promise.all([
      prisma.replyReaction.count({ where: { replyId: rid, type: "HEART" } }),
      prisma.replyReaction.count({ where: { replyId: rid, type: "PLUS_ONE" } }),
    ]);

    return NextResponse.json({
      replyId: rid,
      type,
      active,
      counts: { HEART: hearts, PLUS_ONE: plusOnes },
    });
  } catch (err) {
    console.error("Reply react error:", err);
    return NextResponse.json({ error: "Failed to stamp reply" }, { status: 500 });
  }
}
