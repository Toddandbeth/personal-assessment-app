import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Door } from "@/lib/doors";

const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

// Each door has its own cookie AND its own signature scope: the door name is
// part of what's signed, so a Full Count session can never validate as an
// Intentional Ministries session (even if someone copies the cookie value
// across and renames it).
export function sessionCookieName(door: Door): string {
  return door === "fullcount" ? "da_admin_session_fc" : "da_admin_session_im";
}

function sign(door: Door, expiresAt: number): string {
  const secret = process.env.ADMIN_SESSION_SECRET!;
  return createHmac("sha256", secret).update(`${door}.${expiresAt}`).digest("hex");
}

export function createSessionCookieValue(door: Door): { value: string; maxAge: number } {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  return { value: `${expiresAt}.${sign(door, expiresAt)}`, maxAge: SESSION_MAX_AGE_SECONDS };
}

export function isValidSession(door: Door, cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const [expiresAtRaw, signature] = cookieValue.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(door, expiresAt);
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// The admin codes live only in server environment variables (never
// NEXT_PUBLIC_*), and are compared here on the server only. Case-insensitive.
// Full Count falls back to the original ADMIN_ACCESS_CODE until its own
// variable is set; Intentional Ministries has NO fallback, so it can never be
// opened by the Full Count code by accident.
function expectedCode(door: Door): string | null {
  const raw =
    door === "fullcount"
      ? process.env.ADMIN_ACCESS_CODE_FULLCOUNT ?? process.env.ADMIN_ACCESS_CODE
      : process.env.ADMIN_ACCESS_CODE_INTENTIONALMINISTRIES;
  const code = raw?.trim().toLowerCase();
  return code ? code : null;
}

export function checkAdminCode(door: Door, code: string): boolean {
  const expected = expectedCode(door);
  if (!expected) return false;
  const given = code.trim().toLowerCase();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Convenience for Route Handlers and pages: every admin read/mutation calls
// this itself rather than trusting a page-level check, since Route Handlers
// are independently reachable over the network.
export async function isAdminRequest(door: Door): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSession(door, cookieStore.get(sessionCookieName(door))?.value);
}
