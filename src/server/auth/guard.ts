import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/cookies";
import { verifyAccessToken } from "@/server/auth/tokens";

// Verifies the access token cookie on the given Route Handler request.
// Returns the admin user id, or null when unauthenticated or the access
// token has expired — callers decide whether that means a 401 (API) or a
// redirect to /admin/login (pages), and the client is expected to call
// POST /api/admin/auth/refresh and retry once before giving up.
//
// Takes the NextRequest directly (rather than reading next/headers' cookies())
// so it's a plain function of its input: Route Handlers can be invoked
// directly in tests with a constructed NextRequest, no Next.js request
// context required (see AGENTS.md testability principle).
export async function requireAdminId(
  request: NextRequest,
): Promise<string | null> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  const payload = await verifyAccessToken(accessToken);
  return payload?.sub ?? null;
}
