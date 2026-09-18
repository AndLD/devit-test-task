import axios from "axios";

// Shared axios instance for all client-side API calls (see AGENTS.md — axios
// is the chosen HTTP client for the browser, not native fetch).
// `withCredentials` ensures the httpOnly auth cookies are sent even if the
// API origin ever differs from the app's own. `validateStatus` disables
// axios's default "reject on non-2xx" behavior so callers can inspect
// `response.status` directly, same as they would with `fetch` — a genuine
// network failure (no response at all) still rejects the promise.
export const apiClient = axios.create({
  withCredentials: true,
  validateStatus: () => true,
});
