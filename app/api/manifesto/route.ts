import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

const VALID_REACTIONS = ["RESONATES", "NEW_TRACK", "FREE_SPACE", "CO_SIGN"];
const VALID_CATEGORIES = ["COMMENT", "SUGGESTION", "BUG"];

export async function GET() {
  try {
    const [reactionGroups, comments] = await Promise.all([
      prisma.manifestoReaction.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
      prisma.manifestoComment.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
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

    return NextResponse.json({ counts, comments });
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
      });

      return NextResponse.json({ comment: created }, { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/manifesto error:", error);
    return NextResponse.json({ error: "Failed to process manifesto action" }, { status: 500 });
  }
}
