import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/server/services/auth-service";
import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from "@/server/auth/cookies";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
