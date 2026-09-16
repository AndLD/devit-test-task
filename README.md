# Product Content Studio

> **Status: skeleton.** This README is a placeholder structure to be filled in as the project is implemented. See [AGENTS.md](AGENTS.md) for the strategic/technical decisions and development plan, and [AI-WORKLOG.md](AI-WORKLOG.md) for AI usage notes.

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

- Node.js (version TBD)
- npm
- Docker (for local PostgreSQL via Docker Compose, and for running tests via testcontainers)

## Getting started

> _TODO: fill in once scaffolding lands._

```bash
# 1. Install dependencies
npm install

# 2. Start local PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env

# 4. Apply DB schema & seed demo data (admin user + 3 demo products)
npx prisma migrate dev
npm run seed

# 5. Run the app
npm run dev
```

App will be available at `http://localhost:3000` (TBD).

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
- `JWT_SECRET` — signing secret for admin auth
- `OPENAI_API_KEY` — optional, only needed to exercise the real (non-mocked) LLM bonus feature

## Architecture notes

> _TODO: brief overview of folder structure and layering (routes → services → repositories → Prisma), once implemented. Full principles in [AGENTS.md](AGENTS.md)._

## Known limitations / incomplete parts

> _TODO: list anything left unfinished or out of scope at submission time._

## Time spent

> _TODO: actual hours spent on core vs. bonus work, per task requirements._

## Bonus features

| Bonus | Status | Notes |
|---|---|---|
| LLM integration (OpenAI) | Not started | Mock mode will be the default for reviewers (no API key required); real-mode verification notes will go here. |
| Shopify import | Not started | |
| Design Tools (Figma → code) | Not started | Design link/export will be added here, with transfer confirmed in [AI-WORKLOG.md](AI-WORKLOG.md). |
| Infrastructure (Docker Compose / CI) | Not started | |

## AI usage

Mandatory per task requirements — see [AI-WORKLOG.md](AI-WORKLOG.md) for full details on tools/models used, notable AI-code decisions, and how automated tests verified AI-generated code.
