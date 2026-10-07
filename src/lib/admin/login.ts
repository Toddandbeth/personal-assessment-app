import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Door } from "@/lib/doors";
import { createServiceClient } from "@/lib/supabase/serviceClient";
import { checkAdminCode, createSessionCookieValue, sessionCookieName } from "@/lib/admin/session";

const PER_IP_MAX = 5;
const PER_IP_WINDOW = "15 minutes";
const PER_DOOR_MAX = 25;
const PER_DOOR_WINDOW = "60 minutes";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? "").trim() || request.headers.get("x-real-ip") || "unknown";
}

const TOO_MANY = () =>
  NextResponse.json({ error: "Too many attempts. Please wait a while and try again." }, { status: 429 });

// Shared by both doors' login routes. Wrong guesses are counted in the
// database (da_auth_attempts) so the limit holds across Vercel's serverless
// instances: 5 wrong per IP per 15 minutes, plus 25 wrong per door per hour
// across all IPs (slows a spread-out guessing attack; the owner could be
// briefly locked out while one is happening).
export async function handleAdminLogin(door: Door, request: Request): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";

  const supabase = createServiceClient();
  const ipKey = `admin:${door}:ip:${clientIp(request)}`;
  const doorKey = `admin:${door}:all`;

  for (const key of [ipKey, doorKey]) {
    const { error } = await supabase.rpc("da_attempt_check", { p_key: key });
    if (error) return TOO_MANY();
  }

  if (!code || !checkAdminCode(door, code)) {
    await supabase.rpc("da_attempt_fail", {
      p_key: ipKey, p_max: PER_IP_MAX, p_window: PER_IP_WINDOW, p_lock: PER_IP_WINDOW,
    });
    await supabase.rpc("da_attempt_fail", {
      p_key: doorKey, p_max: PER_DOOR_MAX, p_window: PER_DOOR_WINDOW, p_lock: PER_DOOR_WINDOW,
    });
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  await supabase.rpc("da_attempt_ok", { p_key: ipKey });

  const { value, maxAge } = createSessionCookieValue(door);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(door), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return NextResponse.json({ ok: true });
}

export async function handleAdminLogout(door: Door): Promise<NextResponse> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName(door));
  return NextResponse.json({ ok: true });
}
