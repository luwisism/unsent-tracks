import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getAuthenticatedAdmin } from "../../../lib/adminAuth";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [
      totalUsers,
      suspendedUsers,
      totalNotes,
      hiddenNotes,
      featuredNotes,
      totalReplies,
      totalReactions,
      totalMixtapes,
      notes,
      users,
      mixtapes,
      settingsRows,
      auditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.note.count(),
      prisma.note.count({ where: { isHidden: true } }),
      prisma.note.count({ where: { isFeatured: true } }),
      prisma.songReply.count(),
      prisma.reaction.count(),
      prisma.mixtape.count(),
      prisma.note.findMany({
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 150,
        include: {
          user: { select: { id: true, username: true, badge: true, monogramColor: true, isSuspended: true } },
          replies: { orderBy: { createdAt: "desc" } },
          _count: { select: { reactions: true, replies: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 150,
        select: {
          id: true,
          username: true,
          badge: true,
          monogramColor: true,
          archetype: true,
          tags: true,
          bio: true,
          isSuspended: true,
          suspendedReason: true,
          createdAt: true,
          _count: { select: { notes: true, mixtapes: true, followers: true } },
        },
      }),
      prisma.mixtape.findMany({
        orderBy: { createdAt: "desc" },
        take: 80,
        include: {
          user: { select: { username: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.systemSetting.findMany(),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const settings: Record<string, string> = {
      posting_locked: "false",
      registration_locked: "false",
      maintenance_banner: "",
    };
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({
      admin: { username: admin.username },
      metrics: {
        totalUsers,
        suspendedUsers,
        totalNotes,
        hiddenNotes,
        featuredNotes,
        totalReplies,
        totalReactions,
        totalMixtapes,
      },
      notes,
      users,
      mixtapes,
      settings,
      auditLogs,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load admin telemetry." }, { status: 500 });
  }
}
