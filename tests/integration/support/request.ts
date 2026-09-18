import { NextRequest } from "next/server";

// Builds a NextRequest the same way Next.js would when dispatching to a
// Route Handler, so handlers can be invoked directly in tests with no
// running HTTP server (see AGENTS.md testability principle).
export function buildRequest(
  url: string,
  init: {
    method?: string;
    body?: unknown;
    cookies?: Record<string, string>;
  } = {},
): NextRequest {
  const headers = new Headers();
  if (init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (init.cookies) {
    const cookieHeader = Object.entries(init.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    headers.set("cookie", cookieHeader);
  }

  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}
