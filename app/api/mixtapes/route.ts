import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  const mixtapes = await prisma.mixtape.findMany({
    include: {
      items: {
        orderBy: { order: "asc" },
        include: {
          note: {
            include: {
              reactions: { select: { id: true, type: true } },
              replies: true,
              user: {
                select: { id: true, username: true, monogramColor: true, archetype: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ mixtapes });
}

export async function POST(request: Request) {
  try {
    const { title, subtitle, coverColor, creatorName, userId, noteIds } = await request.json();
    if (!title || !Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json({ error: "Title and at least 1 note required" }, { status: 400 });
    }

    const mixtape = await prisma.mixtape.create({
      data: {
        title,
        subtitle: subtitle || "",
        coverColor: coverColor || "#111111",
        creatorName: creatorName || "ANONYMOUS",
        userId: userId ? Number(userId) : null,
        items: {
          create: noteIds.map((nid: number, idx: number) => ({
            noteId: Number(nid),
            order: idx,
          })),
        },
      },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            note: true,
          },
        },
      },
    });

    return NextResponse.json(mixtape, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create mixtape" }, { status: 500 });
  }
}
