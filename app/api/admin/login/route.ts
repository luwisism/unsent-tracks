import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  checkLoginRateLimit,
  clearFailedLogins,
  createAdminSessionToken,
  ensureAdminCredential,
  getAuthenticatedAdmin,
  getClientIp,
  logAdminAction,
  recordFailedLogin,
  verifyAdminPassword,
  verifySameOrigin,
} from "../../../lib/adminAuth";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, username: admin.username });
}

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rate = checkLoginRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rate.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  try {
    const { username, password } = await request.json();
    const cleanUser = String(username || "").trim().toLowerCase();
    const cleanPass = String(password || "");

    const cred = await ensureAdminCredential();
    const userMatches = cleanUser === cred.username.toLowerCase();
    const passMatches = verifyAdminPassword(cleanPass, cred.passwordHash);

    if (!userMatches || !passMatches) {
      recordFailedLogin(ip);
      await logAdminAction({
        actor: cleanUser || "unknown",
        action: "ADMIN_LOGIN_FAILED",
        targetType: "AUTH",
        targetId: "admin",
        details: "Invalid admin credentials",
        ipAddress: ip,
      });
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
    }

    clearFailedLogins(ip);
    const token = createAdminSessionToken(cred.username, cred.tokenVersion);
    await logAdminAction({
      actor: cred.username,
      action: "ADMIN_LOGIN_SUCCESS",
      targetType: "AUTH",
      targetId: "admin",
      details: "Admin session started",
      ipAddress: ip,
    });

    const response = NextResponse.json({ authenticated: true, username: cred.username });
    response.cookies.set(ADMIN_COOKIE_NAME, token, adminCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const admin = await getAuthenticatedAdmin();
  if (admin) {
    await logAdminAction({
      actor: admin.username,
      action: "ADMIN_LOGOUT",
      targetType: "AUTH",
      targetId: "admin",
      details: "Admin session terminated",
      ipAddress: getClientIp(request),
    });
  }
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE_NAME, "", { ...adminCookieOptions(), maxAge: 0 });
  return response;
}
