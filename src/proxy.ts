import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/cookies";

// Runs on the Edge runtime, so it only does a stateless signature/expiry
// check on the access token — no DB access here. An expired-but-otherwise
// valid session is refreshed by the client calling
// POST /api/admin/auth/refresh (see AGENTS.md), not by this proxy.
async function hasValidAccessToken(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return false;

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  if (await hasValidAccessToken(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/((?!login).*)"],
};
