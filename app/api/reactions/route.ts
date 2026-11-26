import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

function normalizeSignal(raw: unknown): "FELT" | "HEARD" | "SAME FREQUENCY" | null {
  const upper = String(raw || "").toUpperCase();
  if (upper.includes("SAME") && upper.includes("FREQUENCY")) return "SAME FREQUENCY";
  if (upper.includes("HEARD")) return "HEARD";
  if (upper.includes("FELT")) return "FELT";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const noteId = Number(body?.noteId || 0);
    const type = normalizeSignal(body?.type);

    if (!noteId || !type) {
      return NextResponse.json({ error: "Invalid signal", received: body?.type }, { status: 400 });
    }

    const actorId = Number(body?.userId || 0);
    const actorHandle = String(body?.username || body?.senderHandle || "")
      .replace(/^@/, "")
      .trim();

    const actor = actorId
      ? await prisma.user.findUnique({ where: { id: actorId } })
      : actorHandle
      ? await prisma.user.findUnique({ where: { username: actorHandle } })
      : null;

    if (actor) {
      const existing = await prisma.reaction.findFirst({
        where: { noteId, type, userId: actor.id },
      });

      if (existing) {
        await prisma.reaction.delete({ where: { id: existing.id } });
        try {
          const matchingActivity = await prisma.activity.findFirst({
            where: {
              userId: actor.id,
              type: "REACTED",
              noteId,
              summary: { contains: type },
            },
            orderBy: { createdAt: "desc" },
          });
          if (matchingActivity) {
            await prisma.activity.delete({ where: { id: matchingActivity.id } });
          }
        } catch (e) {
          console.error("Reaction activity delete error:", e);
        }
        return NextResponse.json({ removed: true, id: existing.id, type, userId: actor.id }, { status: 200 });
      }
    }

    const reaction = await prisma.reaction.create({
      data: {
        noteId,
        type,
        userId: actor ? actor.id : null,
      },
    });

    if (actor) {
      try {
        const note = await prisma.note.findUnique({
          where: { id: noteId },
          select: { recipient: true },
        });
        await prisma.activity.create({
          data: {
            userId: actor.id,
            type: "REACTED",
            summary: `Sent ${type} signal on note to ${note?.recipient || "Archive"}`,
            noteId,
          },
        });
      } catch (e) {
        console.error("Reaction activity log error:", e);
      }
    }

    return NextResponse.json(reaction, { status: 201 });
  } catch (err) {
    console.error("Reaction POST error:", err);
    return NextResponse.json({ error: "Failed to log signal" }, { status: 500 });
  }
}
