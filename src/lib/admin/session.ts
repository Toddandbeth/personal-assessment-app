import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "da_admin_session";
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

function sign(expiresAt: number): string {
  const secret = process.env.ADMIN_SESSION_SECRET!;
  return createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
}

export function createSessionCookieValue(): { value: string; maxAge: number } {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const signature = sign(expiresAt);
  return { value: `${expiresAt}.${signature}`, maxAge: SESSION_MAX_AGE_SECONDS };
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const [expiresAtRaw, signature] = cookieValue.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(expiresAt);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkAdminCode(code: string): boolean {
  return code.trim().toLowerCase() === process.env.ADMIN_ACCESS_CODE!.trim().toLowerCase();
}

// Convenience for Route Handlers: every admin mutation/read route calls
// this itself rather than trusting that the page-level check already ran,
// since Route Handlers are independently reachable over the network.
export async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
