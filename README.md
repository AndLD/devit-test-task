# Product Content Studio

> **Status: admin UI (login, product list, product editor) implemented and working end-to-end.** Public catalog/product pages are still placeholders. See [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md) for what's next, [AGENTS.md](AGENTS.md) for the strategic/technical decisions, and [AI-WORKLOG.md](AI-WORKLOG.md) for AI usage notes.

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

The app is available at `http://localhost:3000`. Admin pages (`/admin/login`, `/admin/products`, `/admin/products/[id]`) are fully wired to the backend below; the public catalog and product page are still placeholders. The backend can also be exercised directly:

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
npm test
```

> _TODO: describe unit vs. integration test split, and how `testcontainers` is used (requires local Docker, no external services or API keys)._

## Testing strategy & rationale

> _TODO: explain what's covered (validation rules, publish/draft visibility, auth gating, save error handling) and why this split of unit vs. integration tests was chosen. See [AGENTS.md](AGENTS.md) for the testability principles behind it._

## Environment variables

See `.env.example` for the full list (no real secrets committed). Expected variables include:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — signing secrets for the access+refresh token auth pattern
- `OPENAI_API_KEY` — optional, only needed to exercise the real (non-mocked) LLM bonus feature
- `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_API_TOKEN` — optional, only needed for the Shopify import bonus feature

## Architecture notes

Current folder structure:

- `src/app/` — Next.js App Router routes/pages. Admin pages are fully implemented; the public catalog/product pages are still placeholders. `src/app/api/` holds the Route Handlers (`admin/auth/*`, `admin/products*`, `products*`).
- `src/components/admin/` — `AdminTopBar`, `LogoutButton`, `StatusBadge`, `ProductEditorForm` (client component: character counters, Draft/Published toggle, save/error/loading states, never clears user edits on a failed save).
- `src/proxy.ts` — Next.js Proxy (formerly "middleware"): stateless access-token check that redirects unauthenticated `/admin/*` page requests to `/admin/login`. Runs on the Edge runtime, so it does signature/expiry verification only — no DB access.
- `src/server/db/client.ts` — singleton Prisma Client, using the `@prisma/adapter-pg` driver adapter required by Prisma 7.
- `src/server/auth/` — `passwords.ts` (bcrypt hashing), `tokens.ts` (sign/verify access+refresh JWTs via `jose`, refresh-token hashing), `cookies.ts` (cookie read/write helpers), `guard.ts` (`requireAdminId()` used by admin Route Handlers).
- `src/server/repositories/` — thin Prisma wrappers (`AdminUserRepository`, `RefreshTokenRepository`, `ProductRepository`), the only layer that imports the generated Prisma client.
- `src/server/services/` — framework-free business logic (`AuthService`, `ProductService`) built on repository interfaces, so they're unit-testable with fake repositories (no DB, no Next.js) per the testability principle in [AGENTS.md](AGENTS.md).
- `src/lib/validation/` — Zod schemas (`product.ts`, `auth.ts`) shared by client forms (Phase 4) and server Route Handlers, so invalid data is rejected identically everywhere, including direct API calls.
- `src/lib/types/` — domain types decoupled from Prisma's generated types.
- `prisma/schema.prisma` — `AdminUser`, `RefreshToken` (access+refresh JWT pattern), and `Product` models.
- `prisma/seed.ts` — seeds the test admin and 3 demo products; idempotent (upserts), run via `npm run seed`.

Full principles in [AGENTS.md](AGENTS.md).

## Known limitations / incomplete parts

- **Public catalog/product pages are still placeholders.** The admin side (login, list, editor) is fully functional; the public-facing side is next.
- No automated tests yet (Phase 5).

## Time spent

> _TODO: actual hours spent on core vs. bonus work, per task requirements._

## Bonus features

| Bonus                                | Status      | Notes                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM integration (OpenAI)             | Not started | Mock mode will be the default for reviewers (no API key required); real-mode verification notes will go here.                                                                                                                                                                                |
| Shopify import                       | Not started |                                                                                                                                                                                                                                                                                              |
| Design Tools (Figma → code)          | In progress | [Figma file](https://www.figma.com/design/XEWl5YinPePK2aQajd9xE3) — Admin Login, Product List, Product Editor (desktop+mobile) designed and transferred to shadcn/ui components; see [AI-WORKLOG.md](AI-WORKLOG.md) for the transfer notes. Public catalog/product screens not yet designed. |
| Infrastructure (Docker Compose / CI) | Not started |                                                                                                                                                                                                                                                                                              |

## AI usage

Mandatory per task requirements — see [AI-WORKLOG.md](AI-WORKLOG.md) for full details on tools/models used, notable AI-code decisions, and how automated tests verified AI-generated code.
