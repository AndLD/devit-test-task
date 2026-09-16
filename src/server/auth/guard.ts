import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/cookies";
import { verifyAccessToken } from "@/server/auth/tokens";

// Verifies the access token cookie on the current request (Route Handlers /
// Server Components). Returns the admin user id, or null when unauthenticated
// or the access token has expired — callers decide whether that means a 401
// (API) or a redirect to /admin/login (pages), and the client is expected to
// call POST /api/admin/auth/refresh and retry once before giving up.
export async function requireAdminId(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  const payload = await verifyAccessToken(accessToken);
  return payload?.sub ?? null;
}
