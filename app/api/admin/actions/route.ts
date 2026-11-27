import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  getAuthenticatedAdmin,
  getClientIp,
  logAdminAction,
  verifySameOrigin,
} from "../../../lib/adminAuth";

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "TOGGLE_FEATURE_NOTE": {
        const noteId = Number(body.noteId);
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
        const nextVal = !note.isFeatured;
        await prisma.note.update({ where: { id: noteId }, data: { isFeatured: nextVal } });
        await logAdminAction({
          actor: admin.username,
          action: nextVal ? "FEATURE_NOTE" : "UNFEATURE_NOTE",
          targetType: "NOTE",
          targetId: String(noteId),
          details: `Recipient: ${note.recipient}`,
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "TOGGLE_HIDE_NOTE": {
        const noteId = Number(body.noteId);
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
        const nextVal = !note.isHidden;
        await prisma.note.update({
          where: { id: noteId },
          data: {
            isHidden: nextVal,
            moderationNote: nextVal ? String(body.reason || "Hidden by moderator") : null,
          },
        });
        await logAdminAction({
          actor: admin.username,
          action: nextVal ? "HIDE_NOTE" : "RESTORE_NOTE",
          targetType: "NOTE",
          targetId: String(noteId),
          details: `Recipient: ${note.recipient}`,
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "DELETE_NOTE": {
        const noteId = Number(body.noteId);
        const note = await prisma.note.findUnique({ where: { id: noteId } });
        if (!note) return NextResponse.json({ error: "Note not found." }, { status: 404 });
        await prisma.note.delete({ where: { id: noteId } });
        await logAdminAction({
          actor: admin.username,
          action: "DELETE_NOTE",
          targetType: "NOTE",
          targetId: String(noteId),
          details: `Deleted note to "${note.recipient}" (${note.trackName})`,
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "DELETE_REPLY": {
        const replyId = Number(body.replyId);
        const reply = await prisma.songReply.findUnique({ where: { id: replyId } });
        if (!reply) return NextResponse.json({ error: "Reply not found." }, { status: 404 });
        await prisma.songReply.delete({ where: { id: replyId } });
        await logAdminAction({
          actor: admin.username,
          action: "DELETE_REPLY",
          targetType: "REPLY",
          targetId: String(replyId),
          details: `Deleted reply on Note #${reply.noteId}`,
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "TOGGLE_SUSPEND_USER": {
        const userId = Number(body.userId);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
        const nextVal = !user.isSuspended;
        const reason = nextVal ? String(body.reason || "Suspended by administrator").trim() : null;
        await prisma.user.update({
          where: { id: userId },
          data: { isSuspended: nextVal, suspendedReason: reason },
        });
        await logAdminAction({
          actor: admin.username,
          action: nextVal ? "SUSPEND_USER" : "REINSTATE_USER",
          targetType: "USER",
          targetId: `@${user.username}`,
          details: reason || "Account reinstated",
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "RESET_USER_PASSCODE": {
        const userId = Number(body.userId);
        const newPasscode = String(body.newPasscode || "").trim();
        if (newPasscode.length < 4) {
          return NextResponse.json({ error: "New user passcode must be at least 4 characters." }, { status: 400 });
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
        await prisma.user.update({ where: { id: userId }, data: { passcode: newPasscode } });
        await logAdminAction({
          actor: admin.username,
          action: "RESET_USER_PASSCODE",
          targetType: "USER",
          targetId: `@${user.username}`,
          details: "Reset user profile passcode",
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "SET_USER_BADGE": {
        const userId = Number(body.userId);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
        const rawBadge = String(body.badge || "").trim().toUpperCase().slice(0, 20);
        const nextBadge = rawBadge || null;
        await prisma.user.update({ where: { id: userId }, data: { badge: nextBadge } });
        await logAdminAction({
          actor: admin.username,
          action: "SET_USER_BADGE",
          targetType: "USER",
          targetId: `@${user.username}`,
          details: nextBadge ? `Assigned badge: ${nextBadge}` : "Cleared badge",
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "DELETE_USER": {
        const userId = Number(body.userId);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
        await prisma.user.delete({ where: { id: userId } });
        await logAdminAction({
          actor: admin.username,
          action: "DELETE_USER",
          targetType: "USER",
          targetId: `@${user.username}`,
          details: "Permanently deleted user account",
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "SET_MANIFESTO_STATUS": {
        const commentId = Number(body.commentId);
        const rawStatus = String(body.teamStatus || "").toUpperCase();
        const nextStatus = ["ACKNOWLEDGED", "SHIPPED"].includes(rawStatus) ? rawStatus : null;
        const item = await prisma.manifestoComment.findUnique({ where: { id: commentId } });
        if (!item) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
        await prisma.manifestoComment.update({
          where: { id: commentId },
          data: { teamStatus: nextStatus },
        });
        if (nextStatus && item.authorHandle && item.authorHandle !== "ANONYMOUS") {
          const handle = item.authorHandle.replace(/^@+/, "").toLowerCase();
          const u = await prisma.user.findUnique({ where: { username: handle }, select: { id: true } });
          if (u) {
            await prisma.notification.create({
              data: {
                userId: u.id,
                type: "TEAM_STATUS",
                actorHandle: "TEAM BCKN",
                message: `marked your LINER // 00 post as ${nextStatus}`,
              },
            });
          }
        }
        await logAdminAction({
          actor: admin.username,
          action: "SET_MANIFESTO_STATUS",
          targetType: "MANIFESTO",
          targetId: String(commentId),
          details: nextStatus ? `Status: ${nextStatus}` : "Cleared status",
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "DELETE_MANIFESTO_COMMENT": {
        const commentId = Number(body.commentId);
        const item = await prisma.manifestoComment.findUnique({ where: { id: commentId } });
        if (!item) return NextResponse.json({ error: "Comment not found." }, { status: 404 });
        await prisma.manifestoComment.delete({ where: { id: commentId } });
        await logAdminAction({
          actor: admin.username,
          action: "DELETE_MANIFESTO_COMMENT",
          targetType: "MANIFESTO",
          targetId: String(commentId),
          details: `Deleted ${item.category} from ${item.authorHandle}`,
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "DELETE_MIXTAPE": {
        const mixtapeId = Number(body.mixtapeId);
        const mixtape = await prisma.mixtape.findUnique({ where: { id: mixtapeId } });
        if (!mixtape) return NextResponse.json({ error: "Mixtape not found." }, { status: 404 });
        await prisma.mixtape.delete({ where: { id: mixtapeId } });
        await logAdminAction({
          actor: admin.username,
          action: "DELETE_MIXTAPE",
          targetType: "MIXTAPE",
          targetId: String(mixtapeId),
          details: `Deleted mixtape "${mixtape.title}"`,
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      case "UPDATE_SETTINGS": {
        const updates: Record<string, string> = body.settings || {};
        const allowedKeys = ["posting_locked", "registration_locked", "maintenance_banner"];
        for (const key of allowedKeys) {
          if (key in updates) {
            await prisma.systemSetting.upsert({
              where: { key },
              update: { value: String(updates[key]) },
              create: { key, value: String(updates[key]) },
            });
          }
        }
        await logAdminAction({
          actor: admin.username,
          action: "UPDATE_SYSTEM_SETTINGS",
          targetType: "SYSTEM",
          targetId: "settings",
          details: JSON.stringify(updates),
          ipAddress: ip,
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Admin action failed." }, { status: 500 });
  }
}
