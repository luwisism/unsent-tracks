import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const noteId = Number(id);
    if (!Number.isInteger(noteId) || noteId <= 0) {
      return NextResponse.json({ error: "Invalid transmission ID." }, { status: 400 });
    }

    const body = await request.json();
    const { track, lyricExcerpt, senderHandle, userId } = body;

    if (!track?.name || !track?.artist) {
      return NextResponse.json(
        { error: "Select a song to send back as a reply." },
        { status: 400 }
      );
    }

    let resolvedHandle = senderHandle ? String(senderHandle).trim().toLowerCase().replace(/^@+/, "") : null;
    let senderBadge: string | null = null;

    if (userId) {
      const sender = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { username: true, badge: true, isSuspended: true, suspendedReason: true },
      });
      if (sender?.isSuspended) {
        return NextResponse.json(
          { error: sender.suspendedReason || "Suspended accounts cannot post replies." },
          { status: 403 }
        );
      }
      if (sender) {
        resolvedHandle = sender.username;
        senderBadge = sender.badge || null;
      }
    } else if (resolvedHandle) {
      const matched = await prisma.user.findUnique({
        where: { username: resolvedHandle },
        select: { badge: true },
      });
      senderBadge = matched?.badge || null;
    }

    const reply = await prisma.songReply.create({
      data: {
        noteId,
        trackId: String(track.id || ""),
        trackName: String(track.name),
        artistName: String(track.artist),
        albumArt: String(track.albumArt || ""),
        previewUrl: track.previewUrl ? String(track.previewUrl) : null,
        lyricExcerpt: lyricExcerpt?.trim() || null,
        senderHandle: resolvedHandle,
      },
    });

    const parentNote = await prisma.note.findUnique({
      where: { id: noteId },
      select: { userId: true, recipient: true },
    });
    if (parentNote?.userId && (!userId || Number(userId) !== parentNote.userId)) {
      await prisma.notification.create({
        data: {
          userId: parentNote.userId,
          type: "REPLY",
          actorHandle: resolvedHandle || "SOMEONE",
          noteId,
          message: track?.name
            ? `replied with "${track.name}" on your note to ${parentNote.recipient}`
            : `left a reply on your note to ${parentNote.recipient}`,
        },
      });
    }

    return NextResponse.json({
      ...reply,
      senderBadge,
      stampCounts: { HEART: 0, PLUS_ONE: 0 },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to post song reply." }, { status: 500 });
  }
}
