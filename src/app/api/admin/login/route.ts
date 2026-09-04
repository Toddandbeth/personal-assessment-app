import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  checkAdminCode,
  createSessionCookieValue,
} from "@/lib/admin/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";

  if (!code || !checkAdminCode(code)) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const { value, maxAge } = createSessionCookieValue();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return NextResponse.json({ ok: true });
}
