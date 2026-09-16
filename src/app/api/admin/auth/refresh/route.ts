import { NextRequest, NextResponse } from "next/server";
import {
  authService,
  InvalidRefreshTokenError,
} from "@/server/services/auth-service";
import {
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from "@/server/auth/cookies";

// Called by the admin client when an API request comes back 401 with an
// expired access token, so a still-active session doesn't get logged out
// mid-edit just because 15 minutes passed (see AGENTS.md).
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const tokens = await authService.refresh(refreshToken);
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) {
      const response = NextResponse.json(
        { error: "Session expired" },
        { status: 401 },
      );
      clearAuthCookies(response);
      return response;
    }
    throw error;
  }
}
