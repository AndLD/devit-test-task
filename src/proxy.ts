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

// A dynamic Server Component page that calls notFound() (see
// src/app/products/[slug]/page.tsx) can't reliably produce a real 404 HTTP
// status: Next may already have started streaming the response as 200 by
// the time the page's own data fetch resolves and throws. Route Handlers
// don't have this problem (confirmed: GET /api/products/[slug] already
// returns a correct 404), and neither does Next's own "no route matched"
// handling — only the in-component notFound() throw is affected. So the
// published-or-not check is done here instead, before the page ever
// renders, by asking the (already correct) API route; a rewrite to a path
// that matches no route at all reliably reaches Next's built-in 404 (with
// our custom root not-found.tsx), same as any other unmatched URL.
async function isPublishedProductSlug(
  request: NextRequest,
  slug: string,
): Promise<boolean> {
  const apiUrl = new URL(`/api/products/${slug}`, request.url);
  const response = await fetch(apiUrl);
  return response.ok;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const productSlugMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productSlugMatch) {
    const [, slug] = productSlugMatch;
    if (!(await isPublishedProductSlug(request, slug))) {
      return NextResponse.rewrite(new URL("/does-not-match-any-route", request.url));
    }
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login";
  const authenticated = await hasValidAccessToken(request);

  if (isLoginPage) {
    if (authenticated) {
      return NextResponse.redirect(new URL("/admin/products", request.url));
    }
    return NextResponse.next();
  }

  if (authenticated) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/products/:slug"],
};
