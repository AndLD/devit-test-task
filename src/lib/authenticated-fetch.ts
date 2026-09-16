// Wraps `fetch` so a short-lived access token expiring mid-session doesn't
// interrupt the user: on a 401, silently exchanges the refresh-token cookie
// for a new access token (POST /api/admin/auth/refresh) and retries the
// original request exactly once. If the refresh itself fails (the refresh
// token is also expired/revoked — e.g. after logging out elsewhere), the
// original 401 response is returned so the caller can redirect to login.
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;

  const refreshResponse = await fetch("/api/admin/auth/refresh", {
    method: "POST",
  });
  if (!refreshResponse.ok) return response;

  return fetch(input, init);
}
