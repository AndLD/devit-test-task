# Product Content Studio

> **Status: Phase 1 (scaffolding) complete.** Setup/run instructions below are accurate for the current state (placeholder pages only, no auth/data yet). Remaining sections are still placeholders — see [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md) for what's next, [AGENTS.md](AGENTS.md) for the strategic/technical decisions, and [AI-WORKLOG.md](AI-WORKLOG.md) for AI usage notes.

A small product-card editor for an online store: managers edit description/SEO fields and publish product cards in a private admin panel; visitors browse a public catalog of published products.

## Tech stack

- **Framework:** Next.js (App Router), TypeScript
- **ORM / Database:** Prisma + PostgreSQL
- **Validation:** Zod
- **Auth:** JWT
- **UI:** shadcn/ui (Tailwind)
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

# 4. Apply DB schema (seed script lands in Phase 2)
npx prisma migrate dev

# 5. Run the app
npm run dev
```

The app is available at `http://localhost:3000`. Currently this only serves placeholder pages for every planned screen (public catalog `/`, public product page `/products/[slug]`, admin login `/admin/login`, admin product list `/admin/products`, admin product editor `/admin/products/[id]`) — no auth or data yet.

## Test admin credentials

> _TODO: fill in seeded test admin email/password once the seed script exists. Never real/production credentials._

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

Current folder structure (Phase 1 scaffolding):

- `src/app/` — Next.js App Router routes/pages (currently placeholders only).
- `src/server/db/client.ts` — singleton Prisma Client, using the `@prisma/adapter-pg` driver adapter required by Prisma 7.
- `src/server/{services,repositories,auth}/` — reserved for business logic and data access, kept separate from route handlers per the layering in [AGENTS.md](AGENTS.md) (populated starting Phase 2).
- `src/lib/validation/` — Zod schemas shared by client forms and server API routes.
- `src/lib/types/` — domain types decoupled from Prisma's generated types.
- `prisma/schema.prisma` — `AdminUser`, `RefreshToken` (access+refresh JWT pattern), and `Product` models.

Full principles in [AGENTS.md](AGENTS.md).

## Known limitations / incomplete parts

> _TODO: list anything left unfinished or out of scope at submission time._

## Time spent

> _TODO: actual hours spent on core vs. bonus work, per task requirements._

## Bonus features

| Bonus                                | Status      | Notes                                                                                                         |
| ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| LLM integration (OpenAI)             | Not started | Mock mode will be the default for reviewers (no API key required); real-mode verification notes will go here. |
| Shopify import                       | Not started |                                                                                                               |
| Design Tools (Figma → code)          | Not started | Design link/export will be added here, with transfer confirmed in [AI-WORKLOG.md](AI-WORKLOG.md).             |
| Infrastructure (Docker Compose / CI) | Not started |                                                                                                               |

## AI usage

Mandatory per task requirements — see [AI-WORKLOG.md](AI-WORKLOG.md) for full details on tools/models used, notable AI-code decisions, and how automated tests verified AI-generated code.
