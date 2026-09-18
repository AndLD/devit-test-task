import axios from "axios";

// Shared axios instance for server-side (Node.js) calls to third-party
// APIs — OpenAI, Shopify — mirroring src/lib/api-client.ts's browser
// instance. `validateStatus: () => true` so callers inspect
// `response.status` directly instead of axios throwing on a non-2xx
// response, matching that same client's convention (see AGENTS.md).
//
// Not used by src/proxy.ts: that runs on the Edge runtime, which has no
// Node `http`/`net` modules axios depends on, so it must use `fetch`.
export const httpClient = axios.create({
  validateStatus: () => true,
});
