import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const noteId = Number(id);
    const body = await req.json();

    const t = body.track || body.song || null;
    const trackId = t ? String(t.trackId || t.id || `track-${Date.now()}`) : "";
    const trackName = t ? String(t.trackName || t.name || t.title || "").trim() : "";
    const artistName = t ? String(t.artistName || t.artist || "").trim() : "";
    const albumArt = t ? String(t.albumArt || t.image || t.cover || "") : "";
    const previewUrl = t?.previewUrl ? String(t.previewUrl) : null;

    const rawText = body.lyricExcerpt ?? body.lyricLine ?? body.message ?? body.comment ?? "";
    const lyricExcerpt = String(rawText).trim() || null;

    const rawHandle = body.senderHandle || body.username || body.handle || null;
    const cleanHandle = rawHandle
      ? String(rawHandle).replace(/^@/, "").trim()
      : null;

    if (!noteId || (!trackName && !lyricExcerpt)) {
      return NextResponse.json(
        { error: "Provide a song, a text reply, or both." },
        { status: 400 }
      );
    }

    const userId = body.userId ? Number(body.userId) : null;
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : cleanHandle
      ? await prisma.user.findUnique({ where: { username: cleanHandle } })
      : null;

    const resolvedHandle = cleanHandle || user?.username || null;

    const reply = await prisma.songReply.create({
      data: {
        noteId,
        trackId,
        trackName,
        artistName,
        albumArt,
        previewUrl,
        lyricExcerpt,
        senderHandle: resolvedHandle,
      },
    });

    if (user) {
      try {
        const note = await prisma.note.findUnique({
          where: { id: noteId },
          select: { recipient: true },
        });
        const summary =
          trackName && lyricExcerpt
            ? `Replied with “${trackName}” + note on post to${note?.recipient || "Archive"}`
            : trackName
            ? `Replied with “${trackName}” on note to ${note?.recipient || "Archive"}`
            : `Commented “${lyricExcerpt!.slice(0, 42)}${lyricExcerpt!.length > 42 ? "…" : ""}” on note to ${note?.recipient || "Archive"}`;

        await prisma.activity.create({
          data: {
            userId: user.id,
            type: "REPLIED",
            summary,
            noteId,
          },
        });
      } catch (logErr) {
        console.error("Non-blocking reply activity log error:", logErr);
      }
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (err) {
    console.error("Note reply POST error:", err);
    return NextResponse.json(
      { error: "Failed to transmit reply." },
      { status: 500 }
    );
  }
}
