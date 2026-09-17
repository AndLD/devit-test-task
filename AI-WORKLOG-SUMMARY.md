# AI Work Log — Summary

A short read covering exactly what the task requirements ask for. For the full session-by-session log (every phase, every fix, every verification step), see [AI-WORKLOG.md](AI-WORKLOG.md).

## Tools & models used

| Tool                        | Model(s)                     | Role                                                                                       |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| Claude Code                  | Sonnet 5 (`claude-sonnet-5`) | Primary AI pair-programmer: planning, scaffolding, implementation, tests, docs             |
| Figma MCP (via Claude Code)   | —                             | UI design directly on the candidate's Figma account for the Design Tools bonus — [Figma file](https://www.figma.com/design/XEWl5YinPePK2aQajd9xE3/Product-Content-Studio-%E2%80%94-UI-Design?node-id=0-1&t=u1ntu3s3m0f4qGVE-1) |

No other AI coding tools were used (no Cursor/Copilot autocompletion, etc.).

Split of contribution: Claude Code wrote all application, test, and documentation code under direction; the candidate made every strategic/architectural decision (stack, Git Flow, auth pattern, test strategy, scope calls), reviewed and directed each change, and did all manual verification against the running app. See AI-WORKLOG.md's per-entry "My contribution" lines for specifics.

## Three notable AI-code decisions

**1. `requireAdminId()` refactored to take `NextRequest` instead of `next/headers`' `cookies()`.**
The original implementation only worked inside Next's own request-handling machinery, which meant the admin Route Handlers couldn't be invoked directly in an integration test — a real Next.js server would have been needed just to test authorization logic. Changed the function to read `request.cookies` from the `NextRequest` a Route Handler already receives, making it a plain, directly-testable function of its input.
*Verified:* the full backend integration suite (16 tests, including auth-gating scenarios) calls Route Handlers directly with a hand-built `NextRequest` and passes without a live server; the real admin flow was also re-checked live in `next dev` to confirm the refactor didn't regress anything.
*Reference:* [src/server/auth/guard.ts](src/server/auth/guard.ts)

**2. A draft/unknown product page returned HTTP 200 instead of 404 — a genuine Next.js App Router limitation, not an app bug.**
`notFound()` inside `src/app/products/[slug]/page.tsx` rendered the correct "not found" UI, but Next can begin streaming a dynamic page's response before its own data fetch resolves and throws, and the HTTP status can't change once streaming starts. Confirmed this wasn't specific to the route (a genuinely nonexistent slug did it too, while Next's own "no route matched" 404 didn't). Fixed by moving the published/exists check to `src/proxy.ts` (Edge Middleware), which asks the already-correct `GET /api/products/[slug]` Route Handler via `fetch` and rewrites to an unmatched path on a miss — reaching Next's reliable built-in 404 handling before the page ever renders.
*Verified:* found via the Cypress e2e suite (the backend integration tests call Route Handlers directly with no live server, so they structurally couldn't have seen this); confirmed with `curl -D -` before and after the fix, and the e2e suite now asserts the real 404 status.
*Reference:* [src/proxy.ts](src/proxy.ts), [src/app/not-found.tsx](src/app/not-found.tsx)

**3. Jest configured to run under native ESM instead of the default CommonJS + ts-jest setup.**
Prisma 7's generated client uses `import.meta.url` (to locate its wasm query compiler) and `jose` (JWT signing) ships ESM-only with no CJS build — both throw `Must use import to load ES Module` under Jest's default CommonJS transform, and both are unavoidable (the integration tests need the real Prisma client; `tokens.ts` needs `jose`). Configured the backend Jest projects with `ts-jest/presets/default-esm` and `NODE_OPTIONS=--experimental-vm-modules` instead of trying to work around either dependency.
*Verified:* full backend suite (39 unit + 16 integration tests) passes under the new config; confirmed the frontend Jest projects didn't need the same treatment (component code never imports Prisma or `jose`), so they stayed on the simpler CJS transform.
*Reference:* [jest.config.js](jest.config.js)

## Role of automated tests in verifying AI-generated code

Every phase's code was checked against real infrastructure, not just by reading it or trusting green test output: a real Docker Postgres for the backend integration suite (`testcontainers`) and manual testing, a real browser for UI/auth flows, and a real `next dev` server for Cypress. This caught two real bugs that inspection alone had missed:

- `LogoutButton` had no `catch` around its logout request, so a failed request left an unhandled promise rejection even though navigation to `/admin/login` still happened via `finally` — caught by a frontend integration test simulating a rejected logout call.
- The 404-status bug described above — caught only by the Cypress e2e suite, for the structural reason given there.

**Quality of the AI-written tests themselves** was also checked, not assumed: assertions were written to verify actual persisted state, not just response shape — e.g. the save-validation integration tests re-read the row via Prisma after a rejected `PATCH` to confirm it's genuinely unchanged, rather than only checking the 400 status. One bug in the tests themselves was caught this way too: an assertion using `toBeInstanceOf(Array)` on a JSON response body failed despite correct underlying behavior, because Next's `Response`/JSON implementation crosses a realm boundary from the test file's own `Array` constructor — diagnosed and fixed to `Array.isArray(...)` rather than loosened until it passed.

Full detail on all of the above (and everything else — every phase, every fix, every verification step) is in [AI-WORKLOG.md](AI-WORKLOG.md).
