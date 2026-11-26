import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const noteId = Number(id);
    const body = await request.json();

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (body.action === "unlock") {
      if (!note.passcode || note.passcode === String(body.passcode || "").trim()) {
        return NextResponse.json({
          unlocked: true,
          message: note.message,
          lyricExcerpt: note.lyricExcerpt,
        });
      }
      return NextResponse.json({ error: "Incorrect passcode" }, { status: 403 });
    }

    const nextCount = note.listenCount + 1;
    if (note.maxListens && nextCount >= note.maxListens) {
      await prisma.note.delete({ where: { id: noteId } });
      return NextResponse.json({ burned: true, listenCount: nextCount });
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data: { listenCount: nextCount },
    });

    return NextResponse.json({ burned: false, listenCount: updated.listenCount });
  } catch {
    return NextResponse.json({ error: "Failed to process note action" }, { status: 500 });
  }
}
