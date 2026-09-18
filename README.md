# Product Content Studio

> **Status: core functionality (Phases 1–6) complete, all four bonus tasks attempted** — admin UI, public catalog/product pages, a full automated test suite (backend unit + testcontainers-backed integration, frontend component unit + integration, Cypress e2e), full-stack Docker Compose + CI, AI content suggestions (OpenAI), and Shopify import are all in place. Design Tools is partial (admin screens designed in Figma, public screens built directly in code). Shopify import's real Admin API call was verified live end-to-end against a real test store; OpenAI's real mode is implemented and covered by the same tests but wasn't exercised against the live API in this session — see their sections below for exactly what was and wasn't verified. See [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md), [AGENTS.md](AGENTS.md) for strategic/technical decisions, and [AI-WORKLOG.md](AI-WORKLOG.md) for AI usage notes.

A small product-card editor for an online store: managers edit description/SEO fields and publish product cards in a private admin panel; visitors browse a public catalog of published products.

## Tech stack

- **Framework:** Next.js (App Router), TypeScript
- **ORM / Database:** Prisma + PostgreSQL
- **Validation:** Zod
- **Auth:** JWT
- **UI:** shadcn/ui (Tailwind)
- **HTTP client:** axios (not native `fetch`) for both browser requests and Node.js server-side calls to third-party APIs (OpenAI, Shopify) — the one exception is `src/proxy.ts`, which runs on the Edge runtime and must use `fetch`
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
- `POST /api/admin/products/[id]/suggest` — generates an AI content suggestion (mock or real, see "AI content suggestions" below); requires auth
- `POST /api/admin/products/import` — `{ productId }`, imports a product from Shopify as a new draft (see "Shopify import" below); requires auth
- `/admin/*` pages (except `/admin/login`) redirect to `/admin/login` without a valid access token

## Running the whole app via Docker Compose

The steps above run Postgres in Docker and Next.js locally (the normal way to develop this project — see AGENTS.md). `docker compose up` can also run the entire app in containers, useful for verifying the whole stack without a local Node install:

```bash
docker compose up --build
```

This starts three services: `postgres` (same as above), a one-off `migrate` job that applies migrations and seeds the test admin/demo products then exits, and `web` (the Next.js app itself, built via the multi-stage [Dockerfile](Dockerfile) using `next.config.ts`'s `output: "standalone"`) — available at `http://localhost:3000` once `migrate` finishes successfully. JWT secrets are read from your `.env` if present (see Environment variables below); `DATABASE_URL` is fixed to point at the `postgres` service by its Compose network hostname rather than `localhost`, so it doesn't need to be (and isn't) read from `.env` for these two services.

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

All of this — lint, both `tsc --noEmit` targets, build, all four Jest suites, and the Cypress e2e suite — also runs in CI on every push and pull request ([.github/workflows/ci.yml](.github/workflows/ci.yml)), each as its own job so a failure is easy to pinpoint.

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
- `SHOPIFY_STORE_DOMAIN` — optional, only needed for the Shopify import bonus feature
- `SHOPIFY_ADMIN_API_TOKEN` **or** `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET` — one auth method for the Shopify import bonus; see "Shopify import" below for which to use and how to get it

## AI content suggestions (bonus)

A "Suggest with AI" button on the product editor (`ProductEditorForm`) generates a description, SEO title, and SEO description in Ukrainian from the product's **name and characteristics** (never its current draft content — this is meant to help write it, not paraphrase). Clicking it shows a preview with **Apply to editor** and **Discard**; applying only fills the editor's fields in the browser — it never saves or publishes by itself, and never touches unsaved edits already in the other fields. A failed or rejected generation leaves every field exactly as it was.

**How to test it (no API key needed):** leave `OPENAI_API_KEY` unset (the default — see `.env.example`) and click "Suggest with AI" on any product. This uses `MockLlmProvider` (`src/server/services/llm/mock-provider.ts`), a deterministic, offline generator — the preview is explicitly labeled **"Simulated (no API key set)"** so it's never mistaken for a real model's output. Covered by `tests/unit/mock-llm-provider.test.ts`, `tests/integration/admin-suggest.test.ts`, `tests/frontend-integration/product-editor-form-suggest-flow.test.tsx`, and a Cypress e2e test in `cypress/e2e/admin.cy.ts`.

**Real mode:** set `OPENAI_API_KEY` in `.env` to switch to `OpenAiProvider` (`src/server/services/llm/openai-provider.ts`), which calls the OpenAI Chat Completions API (`gpt-4o-mini` by default, override with `OPENAI_MODEL`) with a system prompt constraining the output to the same limits as the editor (description ≤1000, SEO title ≤60, SEO description ≤160, all non-empty), requested as JSON. Either way, the response is re-validated server-side against those same limits before ever reaching the client (`SuggestionService.generate`, `src/server/services/llm/suggestion-service.ts`) — a too-long field is trimmed to fit, but an empty one is rejected outright rather than shown as a usable suggestion, since no amount of truncation fixes that. A network failure, a non-2xx response, or an unparsable/incomplete response from OpenAI surfaces as a plain error message in the editor — the request never touches the database, so there's nothing to lose.

**Known limitation:** real mode is implemented against OpenAI's documented Chat Completions API contract and covered by the same server-side validation as mock mode, but wasn't exercised against the live API in this development session — no `OPENAI_API_KEY` was available in this environment. If you have one, set it in `.env` and try "Suggest with AI" to verify the real path yourself; the request/response shape is otherwise identical to mock mode from the client's point of view.

## Shopify import (bonus)

An "Import from Shopify" form on the admin product list (`ShopifyImportForm`) fetches one product from a Shopify store's Admin API by product ID and creates it in this app's own database as a **draft**, ready for review before publishing — the one deliberate exception to "the admin editor never creates products" (see AGENTS.md). It maps:

- Shopify's `title` → this app's `name`; `handle` → `slug` (Shopify handles are already URL-safe; a numeric suffix is appended on a collision with an existing product).
- `body_html`, stripped of HTML tags → `description` (this app never stores/renders raw HTML — see PROJECT-REQUIREMENTS.md's "product content must never execute as third-party code").
- `vendor`, `product_type`, and product-level `options` (e.g. "Color: Black, White") → `characteristics`.
- `seoTitle`/`seoDescription` are derived from the title/description, since Shopify's default product resource doesn't expose this app's separate SEO fields.

Every field is re-validated against the same limits as a manual save before the row is created (`mapShopifyProduct`, `src/server/services/shopify/mapper.ts`) — truncated if too long, and the import is rejected outright if there's truly no usable content (an empty title and description), the same "truncate, don't silently accept garbage" approach as the LLM feature above.

**Setup:** set `SHOPIFY_STORE_DOMAIN` (e.g. `your-store.myshopify.com`) in `.env`, plus one of two auth methods (see `.env.example`):

- `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` — the current path for any app created after 2026-01-01, when Shopify moved custom-app creation to the [Dev Dashboard](https://dev.shopify.com/dashboard/) and dropped the old directly-revealed static token. The app itself exchanges these for a short-lived (~24h) access token and refreshes it automatically (`ClientCredentialsTokenProvider`, `src/server/services/shopify/token-provider.ts`) — no manual token refresh needed. To get these: create an app in the Dev Dashboard, add the `read_products` scope, **install the app on your store** (a separate step from creating it — skipping it produces an `app_not_installed` error), then copy the Client ID/Secret from the app's Settings.
- `SHOPIFY_ADMIN_API_TOKEN` — a static token, only available if you have a "legacy" custom app created before that date (`StaticTokenProvider`).

Without either configured, the import form shows a plain "not configured" error (503) rather than crashing; there's no mock mode for this bonus (PROJECT-REQUIREMENTS.md doesn't ask for one here, unlike the LLM integration).

**Verified live, end to end:** the real Admin API call (`ShopifyAdminApiClient`, `src/server/services/shopify/shopify-client.ts`) was exercised against a real Shopify trial store created for this purpose — two products were added there (via a connected Shopify MCP tool), a Dev Dashboard app was set up with the client-credentials flow above, and importing one of those products through the running app's own UI produced a correctly-mapped draft product (HTML description cleaned to plain text, options mapped to characteristics, SEO fields derived) via a real network round trip, not a fake. `tests/unit/shopify-mapper.test.ts` and `tests/integration/admin-import.test.ts` use that same product's real fetched data (including its actual HTML) as their fixture, so the mapping logic is verified against genuine Shopify output both in the live run and in the automated suite.

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
- `src/server/lib/http-client.ts` — shared axios instance for server-side (Node.js) calls to third-party APIs, mirroring `src/lib/api-client.ts`'s browser instance; used by the OpenAI and Shopify integrations below.
- `src/server/services/llm/` — the LLM bonus's provider abstraction: `types.ts` (the `LlmProvider` interface), `mock-provider.ts` / `openai-provider.ts` (the two implementations), `suggestion-service.ts` (picks one based on `OPENAI_API_KEY` and validates the result) — see "AI content suggestions" above.
- `src/server/services/shopify/` — the Shopify import bonus: `types.ts` (the `ShopifyClient` interface), `shopify-client.ts` (the real Admin API client), `token-provider.ts` (the two auth methods — a static token, or the client-credentials exchange with auto-refresh), `mapper.ts` (Shopify product → this app's fields, with the same truncate/validate pass as the LLM feature), `import-service.ts` (slug uniqueness + the actual DB write) — see "Shopify import" above.
- `src/lib/validation/` — Zod schemas (`product.ts`, `auth.ts`) shared by client forms (Phase 4) and server Route Handlers, so invalid data is rejected identically everywhere, including direct API calls.
- `src/lib/types/` — domain types decoupled from Prisma's generated types.
- `prisma/schema.prisma` — `AdminUser`, `RefreshToken` (access+refresh JWT pattern), and `Product` models.
- `prisma/seed.ts` — seeds the test admin and 3 demo products; idempotent (upserts), run via `npm run seed`.
- `tests/unit/` — DB-free backend unit tests. `tests/integration/` — Route Handler tests against a real testcontainers Postgres; `tests/integration/support/` holds the container lifecycle (`global-setup.ts`/`global-teardown.ts`), per-test DB reset/seed helpers, and the `NextRequest` builder used to invoke handlers directly.
- `tests/frontend-unit/` / `tests/frontend-integration/` — React Testing Library component tests (`jsdom`); `tests/frontend-support/setup.ts` registers `@testing-library/jest-dom` matchers.
- `cypress/e2e/` — end-to-end tests against a real running app; `cypress/support/commands.ts` has the shared `cy.loginAsAdmin()` helper.
- `Dockerfile` — multi-stage build for the `web` service in `docker-compose.yml` (a `deps`/`builder` stage with the full toolchain, and a lean `runner` stage using `next.config.ts`'s `output: "standalone"`).
- `.github/workflows/ci.yml` — lint, both `tsc --noEmit` targets, build, all four Jest suites, and the Cypress e2e suite, each as a separate job, on every push and PR.

Full principles in [AGENTS.md](AGENTS.md).

## Known limitations / incomplete parts

- Design Tools bonus: the public catalog/product pages were implemented directly in code (matching the admin UI's visual language) rather than being designed in Figma first, unlike the admin screens. The Figma mockups also predate the LLM and Shopify import bonuses — the "Suggest with AI" panel on the product editor and the "Import from Shopify" form on the product list were both added directly in code afterward and have no Figma counterpart.
- LLM integration bonus: real mode (OpenAI) is implemented but wasn't exercised against the live API in this session — no API key was available. Mock mode is fully implemented and tested. See "AI content suggestions" above. (The Shopify import bonus's real Admin API call, by contrast, *was* verified live end to end — see "Shopify import" below.)

## Time spent

Tracked attentively in Clockify (not estimated from commit timestamps — an earlier draft of this section did that and undercounted real elapsed time, since it couldn't see breaks between work sessions). Figures below are from Clockify's full report covering the whole project (14–20 Sep 2026, total **13h46m42s**), superseding an earlier draft that only covered a partial export (through Phase 5, 8h41m47s). Per-phase durations are exact where a logged time entry maps to a single activity; where one entry spans multiple named activities (e.g. "Execute Phase 4 + Fix missing-slug + ... + Execute Phase 5"), its duration is split evenly across the number of activities named, since Clockify's summary export doesn't sub-divide a single tracked entry any further. All figures below were verified to sum back to the report's own total.

**Core budget (target: 6–8h):**

| Phase                                                    | Time         |
| --------------------------------------------------------- | ------------ |
| Planning & AI harness setup (AGENTS.md/DEVELOPMENT-PLAN.md/AI-WORKLOG.md, Git Flow policy, harness corrections) | 3h26m45s     |
| Phase 1 — scaffolding                                      | 53m43s       |
| Phase 2 — backend core (JWT auth, product APIs, seed)       | 33m55s       |
| Phase 4 — UI implementation (admin + public) + the missing-slug fix, token-refresh wiring, and axios migration done along the way | 1h17m54s     |
| Phase 5 — automated tests (backend + frontend + Cypress e2e) and the Node-version/ESM tooling fixes | 1h56m42s     |
| **Core total**                                             | **8h08m59s** |

This is very slightly (~9 minutes) over the 6–8h target in AGENTS.md — the whole overage is a single "Planning final steps" entry (27m55s) that wasn't captured in the earlier partial export; the practical scope of core work didn't change between drafts.

**Docs budget (Phase 6 + ongoing docs maintenance, not a phase with its own time target in AGENTS.md):**

| Activity                                                                 | Time         |
| ------------------------------------------------------------------------- | ------------ |
| Phase 6 — finalize README.md/AI-WORKLOG.md, requirements-compliance review, AI-WORKLOG-SUMMARY.md | 1h15m09s     |
| Docs fixes made alongside later bonus/polish work (md-doc corrections, disclosing the Figma/bonus-UI scope gap) | 38m42s       |
| **Docs total**                                                             | **1h53m51s** |

**Bonus budget (separate target: ~2–3h, not counted against the core budget above):**

| Bonus                                                                          | Time         |
| --------------------------------------------------------------------------------- | ------------ |
| Design Tools (Phase 3 Figma design via MCP, plus the later admin-header fix to match it) | 1h10m04s     |
| LLM integration (OpenAI)                                                       | 39m07s       |
| Shopify import                                                                 | 1h09m18s     |
| Infrastructure (Docker Compose full-stack + CI)                               | 9m47s        |
| Cross-cutting: backend axios migration (benefits both the LLM and Shopify integrations) | 35m36s       |
| **Bonus total**                                                                | **3h43m52s** |

The bonus total runs noticeably over the ~2–3h allotment in AGENTS.md, mainly because all four bonus tasks were attempted (the plan only committed to attempting them, not to finishing all four within budget) and because the Shopify integration needed a second, unplanned pass when Shopify deprecated its legacy static-token auth flow mid-project (see "Shopify auth updated for the new Dev Dashboard flow" in [AI-WORKLOG.md](AI-WORKLOG.md)). Design Tools' own time also grew slightly after the Figma mockups were revisited to fix the admin header.

**Grand total (core + docs + bonus): 13h46m42s**, matching the Clockify report's own reported total exactly.

## Bonus features

| Bonus                                | Status      | Notes                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM integration (OpenAI)             | Done (mock mode fully verified; real mode implemented but not exercised live — no API key in this environment) | "Suggest with AI" button on the product editor generates description/SEO fields in Ukrainian from the product's name and characteristics. See "AI content suggestions" below. |
| Shopify import                       | Done, verified live end-to-end against a real test store | An "Import from Shopify" form on the admin product list creates a new draft product from a Shopify product ID. See "Shopify import" below. |
| Design Tools (Figma → code)          | Partial (1h10m of the bonus budget — see "Time spent" above) | [Figma file](https://www.figma.com/design/XEWl5YinPePK2aQajd9xE3/Product-Content-Studio-%E2%80%94-UI-Design?node-id=0-1&t=u1ntu3s3m0f4qGVE-1) — Admin Login, Product List, Product Editor (desktop+mobile) designed and transferred to shadcn/ui components; see [AI-WORKLOG.md](AI-WORKLOG.md) for the transfer notes. Public catalog/product pages were built directly in code (reusing the same design language) rather than designed in Figma first. The Figma file predates the LLM and Shopify import bonuses below — the "Suggest with AI" panel and "Import from Shopify" form added to the admin screens afterward were built directly in code and have no Figma mockup. |
| Infrastructure (Docker Compose / CI) | Done | `docker compose up` now runs the whole app (Postgres + a one-off `migrate` job + the Next.js app itself), not just the database — see "Running the whole app via Docker Compose" below. GitHub Actions CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every push/PR: lint, both `tsc --noEmit` targets, build, all four Jest suites (backend unit/integration via testcontainers, frontend unit/integration), and the Cypress e2e suite against a Postgres service container. |

## AI usage

Mandatory per task requirements — see [AI-WORKLOG.md](AI-WORKLOG.md) for full details on tools/models used, notable AI-code decisions, and how automated tests verified AI-generated code.
