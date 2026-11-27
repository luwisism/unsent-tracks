import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminSessionToken,
  ensureAdminCredential,
  getAuthenticatedAdmin,
  getClientIp,
  hashAdminPassword,
  logAdminAction,
  verifyAdminPassword,
  verifySameOrigin,
} from "../../../lib/adminAuth";

export async function PATCH(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { currentPassword, newUsername, newPassword } = await request.json();
    const cred = await ensureAdminCredential();

    if (!verifyAdminPassword(String(currentPassword || ""), cred.passwordHash)) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const updatedUsername = String(newUsername || cred.username)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");

    if (updatedUsername.length < 3) {
      return NextResponse.json(
        { error: "Admin username must be at least 3 characters (letters, numbers, ., _, -)." },
        { status: 400 }
      );
    }

    const wantsNewPass = Boolean(newPassword && String(newPassword).trim().length > 0);
    if (wantsNewPass && String(newPassword).length < 10) {
      return NextResponse.json(
        { error: "New admin password must be at least 10 characters." },
        { status: 400 }
      );
    }

    const updated = await prisma.adminCredential.update({
      where: { id: 1 },
      data: {
        username: updatedUsername,
        passwordHash: wantsNewPass ? hashAdminPassword(String(newPassword)) : cred.passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    const newToken = createAdminSessionToken(updated.username, updated.tokenVersion);
    await logAdminAction({
      actor: updated.username,
      action: "ROTATE_ADMIN_CREDENTIALS",
      targetType: "SECURITY",
      targetId: "admin_credential",
      details: `Updated username=${updated.username}${wantsNewPass ? " and rotated password" : ""}`,
      ipAddress: getClientIp(request),
    });

    const res = NextResponse.json({
      success: true,
      username: updated.username,
    });
    res.cookies.set(ADMIN_COOKIE_NAME, newToken, adminCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Failed to update admin credentials." }, { status: 500 });
  }
}
