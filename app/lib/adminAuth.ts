import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const ADMIN_COOKIE_NAME = "sideb_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSigningSecret(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit && explicit.length >= 24) return explicit;
  const fallbackBase = process.env.DATABASE_URL || "sideb-fallback-secret-change-in-env";
  return crypto.createHash("sha256").update("sideb-admin:" + fallbackBase).digest("hex");
}

export function hashAdminPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyAdminPassword(plain: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const derived = crypto.scryptSync(plain, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export async function ensureAdminCredential() {
  let cred = await prisma.adminCredential.findUnique({ where: { id: 1 } });
  if (!cred) {
    const initialUser = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
    const initialPass = process.env.ADMIN_PASSWORD || "SIDEB-ADMIN-2026!";
    cred = await prisma.adminCredential.create({
      data: {
        id: 1,
        username: initialUser,
        passwordHash: hashAdminPassword(initialPass),
        tokenVersion: 1,
      },
    });
  }
  return cred;
}

export function createAdminSessionToken(username: string, tokenVersion: number): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ u: username, v: tokenVersion, exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export async function verifyAdminSessionToken(token?: string | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", getSigningSecret()).update(payloadB64).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      u?: string;
      v?: number;
      exp?: number;
    };
    if (!parsed.u || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    const cred = await ensureAdminCredential();
    if (cred.username !== parsed.u || cred.tokenVersion !== parsed.v) {
      return null;
    }
    return { username: cred.username, tokenVersion: cred.tokenVersion };
  } catch {
    return null;
  }
}

export async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= 5) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count += 1;
  }
}

export function clearFailedLogins(ip: string) {
  loginAttempts.delete(ip);
}

export async function logAdminAction(params: {
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actor: params.actor,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details || "",
        ipAddress: params.ipAddress || "unknown",
      },
    });
  } catch {}
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
