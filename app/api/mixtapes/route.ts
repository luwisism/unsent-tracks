import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
    const mixtapes = await prisma.mixtape.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            note: {
              include: {
                reactions: { select: { id: true, type: true } },
                replies: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    badge: true,
                    monogramColor: true,
                    archetype: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const sanitized = mixtapes.map((m) => ({
      ...m,
      items: m.items
        .filter((item) => !item.note.isHidden)
        .map((item) => {
          const { passcode, ...safeNote } = item.note;
          return {
            ...item,
            note: { ...safeNote, isPasscodeProtected: Boolean(passcode) },
          };
        }),
    }));

    return NextResponse.json({ mixtapes: sanitized });
  } catch {
    return NextResponse.json({ error: "Failed to load mixtapes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, subtitle, coverColor, creatorName, noteIds } = body;

    if (!title?.trim() || !Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json(
        { error: "Mixtape title and at least one transmission are required." },
        { status: 400 }
      );
    }

    const uniqueIds = Array.from(new Set(noteIds.map((id: unknown) => Number(id)).filter(Boolean)));

    const created = await prisma.mixtape.create({
      data: {
        title: title.trim(),
        subtitle: String(subtitle || "").trim(),
        coverColor: coverColor || "#111111",
        creatorName: String(creatorName || "ANON").trim() || "ANON",
        items: {
          create: uniqueIds.map((noteId, idx) => ({
            noteId,
            order: idx,
          })),
        },
      },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            note: {
              include: {
                reactions: { select: { id: true, type: true } },
                replies: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    badge: true,
                    monogramColor: true,
                    archetype: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ mixtape: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create mixtape." }, { status: 500 });
  }
}
