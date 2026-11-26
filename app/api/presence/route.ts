import { NextResponse } from "next/server";

// In-memory active listener heartbeat map (expires after 25s)
const activeListeners = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const now = Date.now();
    if (sessionId) {
      activeListeners.set(String(sessionId), now);
    }
    for (const [key, ts] of activeListeners.entries()) {
      if (now - ts > 25000) activeListeners.delete(key);
    }
    return NextResponse.json({
      count: Math.max(1, activeListeners.size),
      serverTime: now,
    });
  } catch {
    return NextResponse.json({ count: 1, serverTime: Date.now() });
  }
}
