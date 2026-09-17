# Product Content Studio

> **Status: core functionality complete — admin UI, public catalog/product pages, and automated tests (unit + testcontainers-backed integration) are all in place.** See [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md) for what's next (bonus tasks), [AGENTS.md](AGENTS.md) for the strategic/technical decisions, and [AI-WORKLOG.md](AI-WORKLOG.md) for AI usage notes.

A small product-card editor for an online store: managers edit description/SEO fields and publish product cards in a private admin panel; visitors browse a public catalog of published products.

## Tech stack

- **Framework:** Next.js (App Router), TypeScript
- **ORM / Database:** Prisma + PostgreSQL
- **Validation:** Zod
- **Auth:** JWT
- **UI:** shadcn/ui (Tailwind)
- **Client-side HTTP:** axios (not native `fetch`) for all requests from the browser
- **Testing:** Jest, with `testcontainers`-backed ephemeral PostgreSQL for integration tests
- **Tooling:** ESLint + Prettier, npm

Full rationale for these choices lives in [AGENTS.md](AGENTS.md).

## Prerequisites

- Node.js **22.21.1** (see `.nvmrc` — run `nvm use` if you have nvm; Prisma 7 requires Node ^20.19/^22.12/>=24, which rules out plain Node 20.14/20.x-early)
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
npm test              # unit tests, then integration tests
npm run test:unit         # fast, no DB, no Docker
npm run test:integration  # spins up a real ephemeral Postgres via testcontainers (needs Docker running)
```

Both suites are fully reproducible and need no external services or API keys — `test:integration` only needs a local Docker daemon, the same one used for `docker compose up`. No `.env` is required for tests: they use fixed test-only JWT secrets and a Postgres container testcontainers starts and tears down itself.

Jest runs under Node's native ESM support (`--experimental-vm-modules`, wired into both npm scripts) rather than the more common CommonJS + ts-jest setup — see the note at the top of [jest.config.ts](jest.config.ts): Prisma 7's generated client uses `import.meta.url` and `jose` ships ESM-only, both unusable under Jest's default CJS transform.

## Testing strategy & rationale

Two layers, matching the testability principle in [AGENTS.md](AGENTS.md):

- **Unit tests** (`tests/unit/`) — no DB, no Next.js, no Docker. Cover the framework-free business logic that's injected with fake repositories instead of Prisma (`ProductService`, `AuthService`), the shared Zod validation schemas (field length limits, non-empty, status enum), JWT sign/verify round-trips and tamper rejection (`tokens.ts`), and password hashing (`passwords.ts`). This is only possible because the repository/service split in AGENTS.md makes every repository dependency an injectable, structurally-typed parameter — a fake object satisfying the same shape as `ProductRepository`/`AdminUserRepository`/`RefreshTokenRepository` is enough, no mocking framework needed.
- **Integration tests** (`tests/integration/`) — exercise the actual Next.js Route Handlers (imported and invoked directly with a constructed `NextRequest`, no HTTP server needed) against a real, disposable PostgreSQL container per test run (`testcontainers`, migrated with `prisma migrate deploy`), truncated between tests. Nothing is mocked at the DB layer here. These cover the critical end-to-end scenarios named in AGENTS.md's Phase 5 plan:
  - **Draft invisibility** — the public API (`/api/products`, `/api/products/[slug]`) never returns a draft, whether listed or requested directly by slug (404, same as an unknown slug).
  - **Auth gating** — admin routes (`/api/admin/products`, `/api/admin/products/[id]`) 401 with no cookie, a garbage access token, or an expired session, and succeed with a valid one.
  - **Save validation** — an oversized description, an empty required field, etc. are rejected with 400 by the real API (not just the client form) and leave the stored row unchanged — verified by re-reading the row via Prisma after the rejected request.
  - **Refresh rotation** — a refresh token can only be used once; reusing an already-rotated-out token is rejected (replay protection), and logout revokes the current one.

One implementation change came out of writing these tests: `requireAdminId()` (`src/server/auth/guard.ts`) used to read the access token via `next/headers`' `cookies()`, which only works inside Next's own request-handling machinery — Route Handlers can't be invoked directly in a test that way. It now takes the `NextRequest` it's given and reads `request.cookies` instead, which is both more idiomatic for a Route Handler and makes it a plain, directly testable function of its input. See [AI-WORKLOG.md](AI-WORKLOG.md) for the full note.

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
- `src/proxy.ts` — Next.js Proxy (formerly "middleware"): stateless access-token check that redirects unauthenticated `/admin/*` page requests to `/admin/login`. Runs on the Edge runtime, so it does signature/expiry verification only — no DB access.
- `src/server/db/client.ts` — singleton Prisma Client, using the `@prisma/adapter-pg` driver adapter required by Prisma 7.
- `src/server/auth/` — `passwords.ts` (bcrypt hashing), `tokens.ts` (sign/verify access+refresh JWTs via `jose`, refresh-token hashing), `cookies.ts` (cookie read/write helpers), `guard.ts` (`requireAdminId(request)` used by admin Route Handlers).
- `src/server/repositories/` — thin Prisma wrappers (`AdminUserRepository`, `RefreshTokenRepository`, `ProductRepository`), the only layer that imports the generated Prisma client.
- `src/server/services/` — framework-free business logic (`AuthService`, `ProductService`) built on repository interfaces, so they're unit-testable with fake repositories (no DB, no Next.js) per the testability principle in [AGENTS.md](AGENTS.md).
- `src/lib/validation/` — Zod schemas (`product.ts`, `auth.ts`) shared by client forms (Phase 4) and server Route Handlers, so invalid data is rejected identically everywhere, including direct API calls.
- `src/lib/types/` — domain types decoupled from Prisma's generated types.
- `prisma/schema.prisma` — `AdminUser`, `RefreshToken` (access+refresh JWT pattern), and `Product` models.
- `prisma/seed.ts` — seeds the test admin and 3 demo products; idempotent (upserts), run via `npm run seed`.
- `tests/unit/` — DB-free unit tests. `tests/integration/` — Route Handler tests against a real testcontainers Postgres; `tests/integration/support/` holds the container lifecycle (`global-setup.ts`/`global-teardown.ts`), per-test DB reset/seed helpers, and the `NextRequest` builder used to invoke handlers directly.

Full principles in [AGENTS.md](AGENTS.md).

## Known limitations / incomplete parts

- Design Tools bonus: the public catalog/product pages were implemented directly in code (matching the admin UI's visual language) rather than being designed in Figma first, unlike the admin screens.
- No LLM integration, Shopify import, or CI pipeline yet — see Bonus features below.

## Time spent

> _TODO: actual hours spent on core vs. bonus work, per task requirements._

## Bonus features

| Bonus                                | Status      | Notes                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM integration (OpenAI)             | Not started | Mock mode will be the default for reviewers (no API key required); real-mode verification notes will go here.                                                                                                                                                                                |
| Shopify import                       | Not started |                                                                                                                                                                                                                                                                                              |
| Design Tools (Figma → code)          | In progress | [Figma file](https://www.figma.com/design/XEWl5YinPePK2aQajd9xE3) — Admin Login, Product List, Product Editor (desktop+mobile) designed and transferred to shadcn/ui components; see [AI-WORKLOG.md](AI-WORKLOG.md) for the transfer notes. Public catalog/product pages were built directly in code (reusing the same design language) rather than designed in Figma first. |
| Infrastructure (Docker Compose / CI) | Not started |                                                                                                                                                                                                                                                                                              |

## AI usage

Mandatory per task requirements — see [AI-WORKLOG.md](AI-WORKLOG.md) for full details on tools/models used, notable AI-code decisions, and how automated tests verified AI-generated code.
