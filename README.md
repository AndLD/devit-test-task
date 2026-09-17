# Product Content Studio

> **Status: core functionality (Phases 1–6) complete** — admin UI, public catalog/product pages, and a full automated test suite (backend unit + testcontainers-backed integration, frontend component unit + integration, Cypress e2e) are all in place and passing. See [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md) for what's next (bonus tasks), [AGENTS.md](AGENTS.md) for the strategic/technical decisions, and [AI-WORKLOG.md](AI-WORKLOG.md) for AI usage notes.

A small product-card editor for an online store: managers edit description/SEO fields and publish product cards in a private admin panel; visitors browse a public catalog of published products.

## Tech stack

- **Framework:** Next.js (App Router), TypeScript
- **ORM / Database:** Prisma + PostgreSQL
- **Validation:** Zod
- **Auth:** JWT
- **UI:** shadcn/ui (Tailwind)
- **Client-side HTTP:** axios (not native `fetch`) for all requests from the browser
- **Testing:** Jest (backend unit + integration, and frontend component unit + integration), with `testcontainers`-backed ephemeral PostgreSQL for backend integration tests, plus Cypress for end-to-end tests
- **Tooling:** ESLint + Prettier, npm

Full rationale for these choices lives in [AGENTS.md](AGENTS.md).

## Prerequisites

- Node.js **22.21.1** (see `.nvmrc` — run `nvm use` **in every new terminal/session**, since nvm doesn't persist it automatically; with no argument, `nvm use` reads the version from `.nvmrc` in the current directory). `next dev`/`build`/`start` tolerate a wider range of Node versions, but `npm run seed` (and `test:e2e`, which reseeds first) needs Node ^20.19/^22.12/>=24 — Prisma 7's CLI tooling (`@prisma/dev`) breaks on older versions with a raw `ERR_REQUIRE_ESM` crash otherwise. `npm run seed` checks this up front and fails with a clear message if you forgot `nvm use`.
- npm
- Docker (for local PostgreSQL via Docker Compose, and later for running integration tests via testcontainers)

## Getting started

```bash
# 0. Use the expected Node version (if you use nvm)
nvm use

# 1. Install dependencies
npm install

# 2. Start local PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env
# then fill in JWT_ACCESS_SECRET / JWT_REFRESH_SECRET, e.g.:
#   openssl rand -base64 48

# 4. Apply DB schema
npx prisma migrate dev

# 5. Seed the test admin account and 3 demo products (2 published, 1 draft)
npm run seed

# 6. Run the app
npm run dev
```

The app is available at `http://localhost:3000`. Admin pages (`/admin/login`, `/admin/products`, `/admin/products/[id]`) and the public pages (`/` catalog, `/products/[slug]`) are fully wired to the backend below. The backend can also be exercised directly:

- `GET /api/products` — published products only
- `GET /api/products/[slug]` — a published product's full detail (404 for drafts or unknown slugs, including by direct URL)
- `POST /api/admin/auth/login` — `{ email, password }`, sets `access_token`/`refresh_token` httpOnly cookies
- `POST /api/admin/auth/refresh` — rotates the refresh token, issues a new access token (call this when an admin request returns 401)
- `POST /api/admin/auth/logout` — revokes the refresh token, clears cookies
- `GET /api/admin/products` — all products (id, name, status); requires auth
- `GET /api/admin/products/[id]` — full product detail; requires auth
- `PATCH /api/admin/products/[id]` — update `description`/`seoTitle`/`seoDescription`/`status` (Zod-validated server-side, same limits as the editor); requires auth
- `/admin/*` pages (except `/admin/login`) redirect to `/admin/login` without a valid access token

## Test admin credentials

Seeded by `npm run seed` (override via `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` before seeding):

- Email: `admin@example.com`
- Password: `admin12345`

Not a real/production credential — it only exists in your local seeded database.

## Running tests

```bash
npm test                       # backend unit, backend integration, then frontend unit + integration
npm run test:unit               # backend business logic — fast, no DB, no Docker
npm run test:integration        # backend Route Handlers — spins up a real ephemeral Postgres via testcontainers (needs Docker running)
npm run test:frontend           # frontend component unit + integration tests (jsdom, no server, no DB)
npm run test:frontend-unit
npm run test:frontend-integration
npm run test:e2e                # Cypress against a real `next dev` server and the Docker Compose Postgres (needs docker compose up + migrations already applied)
```

All four Jest suites (`test:unit`, `test:integration`, `test:frontend-unit`, `test:frontend-integration`) are fully reproducible and need no external services or API keys — `test:integration` only needs a local Docker daemon, the same one used for `docker compose up`. No `.env` is required for them: they use fixed test-only JWT secrets and a Postgres container testcontainers starts and tears down itself.

`test:e2e` is the exception: it needs the Docker Compose Postgres already running with migrations applied (the normal "Getting started" setup), reseeds it (`npm run seed`, idempotent) before starting a real `next dev` server, then runs Cypress against it headlessly. Run `npm run cypress:open` instead for the interactive runner during development.

Jest runs under Node's native ESM support (`--experimental-vm-modules`, wired into the backend npm scripts) rather than the more common CommonJS + ts-jest setup — see the note at the top of [jest.config.js](jest.config.js): Prisma 7's generated client uses `import.meta.url` and `jose` ships ESM-only, both unusable under Jest's default CJS transform. The frontend Jest projects don't need this — component code never imports Prisma or `jose` — so they use the plain CJS transform with `jest-environment-jsdom`.

## Testing strategy & rationale

Four layers, matching the testability principle in [AGENTS.md](AGENTS.md):

- **Backend unit tests** (`tests/unit/`) — no DB, no Next.js, no Docker. Cover the framework-free business logic that's injected with fake repositories instead of Prisma (`ProductService`, `AuthService`), the shared Zod validation schemas (field length limits, non-empty, status enum), JWT sign/verify round-trips and tamper rejection (`tokens.ts`), and password hashing (`passwords.ts`). This is only possible because the repository/service split in AGENTS.md makes every repository dependency an injectable, structurally-typed parameter — a fake object satisfying the same shape as `ProductRepository`/`AdminUserRepository`/`RefreshTokenRepository` is enough, no mocking framework needed.
- **Backend integration tests** (`tests/integration/`) — exercise the actual Next.js Route Handlers (imported and invoked directly with a constructed `NextRequest`, no HTTP server needed) against a real, disposable PostgreSQL container per test run (`testcontainers`, migrated with `prisma migrate deploy`), truncated between tests. Nothing is mocked at the DB layer here. These cover the critical end-to-end scenarios named in AGENTS.md's Phase 5 plan:
  - **Draft invisibility** — the public API (`/api/products`, `/api/products/[slug]`) never returns a draft, whether listed or requested directly by slug (404, same as an unknown slug).
  - **Auth gating** — admin routes (`/api/admin/products`, `/api/admin/products/[id]`) 401 with no cookie, a garbage access token, or an expired session, and succeed with a valid one.
  - **Save validation** — an oversized description, an empty required field, etc. are rejected with 400 by the real API (not just the client form) and leave the stored row unchanged — verified by re-reading the row via Prisma after the rejected request.
  - **Refresh rotation** — a refresh token can only be used once; reusing an already-rotated-out token is rejected (replay protection), and logout revokes the current one.
- **Frontend unit tests** (`tests/frontend-unit/`) — React Testing Library + `jsdom`, no HTTP layer touched at all. Cover `StatusBadge` (pure presentational) and `ProductEditorForm`'s client-side validation (Save disables/re-enables as fields cross the description/SEO-title/SEO-description limits), asserting along the way that typing or toggling status never calls the API.
- **Frontend integration tests** (`tests/frontend-integration/`) — same tooling, but the HTTP layer (`@/lib/api-client`, `@/lib/authenticated-request`) and `next/navigation` are mocked with `jest.mock`, so a component's full interaction cycle can be driven without a real server: the login form (wrong password, success, network error), the product editor's save flow (success, server-rejected save with entered values preserved, session-expired redirect, network error), and the logout button (including that a failed logout request still navigates away — a real bug this test caught, see below).
- **End-to-end tests** (`cypress/e2e/`) — Cypress against a real `next dev` server and the Docker Compose Postgres, covering the core flows for both sides:
  - `admin.cy.ts` — wrong-password error, successful login, an authenticated session redirected away from `/admin/login`, an unauthenticated visit to `/admin/products` redirected to login, the product list showing both draft and published items, Save disabling on invalid input, saving a change and having it persist across reload, and logout.
  - `public.cy.ts` — the catalog listing only published products, opening a product page and checking its content and `<title>` (SEO), and a draft 404ing by direct URL.
  - `publish-status.cy.ts` — the cross-cutting flow: publishing a draft from the admin editor makes it appear in the public catalog, and unpublishing it removes it again. Self-healing (forces the fixture back to `DRAFT` first) and restores that state at the end, since `prisma/seed.ts`'s product upserts don't reset already-existing rows.

Two real bugs surfaced while writing these tests, not by inspection:

- `requireAdminId()` (`src/server/auth/guard.ts`) used to read the access token via `next/headers`' `cookies()`, which only works inside Next's own request-handling machinery — Route Handlers couldn't be invoked directly in a backend integration test that way. It now takes the `NextRequest` it's given and reads `request.cookies` instead.
- `LogoutButton` didn't catch a failed logout request, so a network error left an unhandled promise rejection even though navigation to `/admin/login` still happened via `finally` — caught by a frontend integration test simulating a rejected logout call, fixed by adding a `catch`.
- The Cypress e2e suite also caught a case unit/integration tests structurally couldn't: `src/app/products/[slug]/page.tsx`'s `notFound()` call reliably rendered the right "not found" UI but with an HTTP **200** status, not 404 — Next can start streaming a dynamic page's response before the page's own data fetch resolves and throws, and the status can't change once streaming has begun (a known App Router/RSC behavior, not specific to this route — even Next's own "no route matched" 404 doesn't go through this code path). Fixed by moving the published/exists check to `src/proxy.ts` (Edge Middleware): it asks the already-correct `GET /api/products/[slug]` Route Handler via `fetch`, and on a miss, rewrites to a path that matches no route at all, reaching Next's built-in 404 handling (with a root-level `src/app/not-found.tsx`) before the page ever renders. This is exactly the workaround Next's own docs recommend for this trade-off, and it's the reason `test:integration`'s route-handler tests (which call handlers directly, no live server) couldn't have caught it — only a real running server, as Cypress uses, could.

## Environment variables

See `.env.example` for the full list (no real secrets committed). Expected variables include:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — signing secrets for the access+refresh token auth pattern
- `OPENAI_API_KEY` — optional, only needed to exercise the real (non-mocked) LLM bonus feature
- `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_API_TOKEN` — optional, only needed for the Shopify import bonus feature

## Architecture notes

Current folder structure:

- `src/app/` — Next.js App Router routes/pages. Admin pages and the public catalog (`/`) / product page (`/products/[slug]`) are fully implemented. `src/app/api/` holds the Route Handlers (`admin/auth/*`, `admin/products*`, `products*`).
- `src/components/admin/` — `AdminTopBar`, `LogoutButton`, `StatusBadge`, `ProductEditorForm` (client component: character counters, Draft/Published toggle, save/error/loading states, never clears user edits on a failed save).
- `src/components/public/` — `SiteHeader`, used by the public catalog and product pages.
- `src/proxy.ts` — Next.js Proxy (formerly "middleware"): stateless access-token check that redirects unauthenticated `/admin/*` page requests to `/admin/login` (and an authenticated one away from `/admin/login`). Also guards `/products/[slug]`: since a page's own `notFound()` can't reliably produce a real 404 status (see Testing strategy above), it asks `GET /api/products/[slug]` via `fetch` and rewrites to an unmatched path on a miss. Runs on the Edge runtime — no direct DB access, hence the `fetch` to the API route instead of a repository call.
- `src/app/not-found.tsx` — site-wide 404 UI, reached both by genuinely unmatched URLs and by the proxy's rewrite for a draft/unknown product slug.
- `src/server/db/client.ts` — singleton Prisma Client, using the `@prisma/adapter-pg` driver adapter required by Prisma 7.
- `src/server/auth/` — `passwords.ts` (bcrypt hashing), `tokens.ts` (sign/verify access+refresh JWTs via `jose`, refresh-token hashing), `cookies.ts` (cookie read/write helpers), `guard.ts` (`requireAdminId(request)` used by admin Route Handlers).
- `src/server/repositories/` — thin Prisma wrappers (`AdminUserRepository`, `RefreshTokenRepository`, `ProductRepository`), the only layer that imports the generated Prisma client.
- `src/server/services/` — framework-free business logic (`AuthService`, `ProductService`) built on repository interfaces, so they're unit-testable with fake repositories (no DB, no Next.js) per the testability principle in [AGENTS.md](AGENTS.md).
- `src/lib/validation/` — Zod schemas (`product.ts`, `auth.ts`) shared by client forms (Phase 4) and server Route Handlers, so invalid data is rejected identically everywhere, including direct API calls.
- `src/lib/types/` — domain types decoupled from Prisma's generated types.
- `prisma/schema.prisma` — `AdminUser`, `RefreshToken` (access+refresh JWT pattern), and `Product` models.
- `prisma/seed.ts` — seeds the test admin and 3 demo products; idempotent (upserts), run via `npm run seed`.
- `tests/unit/` — DB-free backend unit tests. `tests/integration/` — Route Handler tests against a real testcontainers Postgres; `tests/integration/support/` holds the container lifecycle (`global-setup.ts`/`global-teardown.ts`), per-test DB reset/seed helpers, and the `NextRequest` builder used to invoke handlers directly.
- `tests/frontend-unit/` / `tests/frontend-integration/` — React Testing Library component tests (`jsdom`); `tests/frontend-support/setup.ts` registers `@testing-library/jest-dom` matchers.
- `cypress/e2e/` — end-to-end tests against a real running app; `cypress/support/commands.ts` has the shared `cy.loginAsAdmin()` helper.

Full principles in [AGENTS.md](AGENTS.md).

## Known limitations / incomplete parts

- Design Tools bonus: the public catalog/product pages were implemented directly in code (matching the admin UI's visual language) rather than being designed in Figma first, unlike the admin screens.
- No LLM integration, Shopify import, or CI pipeline yet — see Bonus features below.

## Time spent

Tracked attentively in Clockify (not estimated from commit timestamps — an earlier draft of this section did that and undercounted real elapsed time, since it couldn't see breaks between work sessions). Per-phase durations below are exact where a logged time entry maps to a single phase; where one entry spans multiple activities (e.g. "Execute Phase 4 + Fix missing-slug + ... + Execute Phase 5"), its duration is split evenly across the number of distinct activities named, since Clockify's summary export doesn't sub-divide a single entry further.

**Core budget (target: 6–8h):**

| Phase                                                    | Time         |
| --------------------------------------------------------- | ------------ |
| Planning & AI harness setup (AGENTS.md/DEVELOPMENT-PLAN.md/AI-WORKLOG.md, Git Flow policy, harness corrections) | 2h58m50s     |
| Phase 1 — scaffolding                                      | 53m43s       |
| Phase 2 — backend core (JWT auth, product APIs, seed)       | 33m55s       |
| Phase 4 — UI implementation (admin + public) + the missing-slug fix, token-refresh wiring, and axios migration done along the way | 1h17m54s     |
| Phase 5 — automated tests (backend + frontend + Cypress e2e) and the Node-version/ESM tooling fixes | 1h56m42s     |
| **Core total (through Phase 5)**                           | **7h41m04s** |

This fits inside the 6–8h core budget in AGENTS.md, though Phase 6 (this docs pass) isn't included above — it wasn't logged in Clockify separately in time to make this report, so actual core time is somewhat higher once it's added.

**Bonus budget (separate target: ~2–3h, not counted against the core budget above):**

| Bonus                          | Time     |
| ------------------------------- | -------- |
| Design Tools (Phase 3 — Figma via MCP) | 1h00m43s |

Phase 3 (design) was originally miscounted into the core total in an earlier draft of this section — Design Tools is a bonus item per PROJECT-REQUIREMENTS.md, not part of the core admin/public/tests scope, so its time belongs in the bonus budget instead. See Bonus features below for status of the other bonus tasks (none started).

## Bonus features

| Bonus                                | Status      | Notes                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM integration (OpenAI)             | Not started | Mock mode will be the default for reviewers (no API key required); real-mode verification notes will go here.                                                                                                                                                                                |
| Shopify import                       | Not started |                                                                                                                                                                                                                                                                                              |
| Design Tools (Figma → code)          | In progress (~1h of the ~2–3h bonus budget) | [Figma file](https://www.figma.com/design/XEWl5YinPePK2aQajd9xE3/Product-Content-Studio-%E2%80%94-UI-Design?node-id=0-1&t=u1ntu3s3m0f4qGVE-1) — Admin Login, Product List, Product Editor (desktop+mobile) designed and transferred to shadcn/ui components; see [AI-WORKLOG.md](AI-WORKLOG.md) for the transfer notes. Public catalog/product pages were built directly in code (reusing the same design language) rather than designed in Figma first. |
| Infrastructure (Docker Compose / CI) | Not started |                                                                                                                                                                                                                                                                                              |

## AI usage

Mandatory per task requirements — see [AI-WORKLOG.md](AI-WORKLOG.md) for full details on tools/models used, notable AI-code decisions, and how automated tests verified AI-generated code.
