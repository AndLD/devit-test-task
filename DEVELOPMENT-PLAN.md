# Development Plan

Approved implementation plan for Product Content Studio. Strategic decisions behind this plan (tech stack, architecture principles, logging policy) live in [AGENTS.md](AGENTS.md); progress and known limitations get tracked in [README.md](README.md) and [AI-WORKLOG.md](AI-WORKLOG.md).

## Time budget

- Core functionality + tests: **6–8 hours**.
- Bonus tasks: separate **~2–3 hour** allotment, not counted against the core budget. Optional for acceptance — if time runs out mid-bonus, the unfinished part is documented rather than left half-wired into the core app.

## Phase 1 — Scaffolding (no design dependency)

- Next.js (App Router) + TypeScript project setup.
- `docker-compose.yml` with PostgreSQL only (Next.js runs locally, un-dockerized, during development).
- Prisma schema (Product model: name, characteristics, description, SEO title, SEO description, status `draft`/`published`; admin user model).
- `.env.example` documenting required env vars without real values.
- Core TS types and Zod schemas for product fields (mirroring the length/non-empty constraints).
- Layered folder structure per AGENTS.md (routes/handlers → services → repositories → Prisma), designed for low coupling and unit-testability.
- Placeholder pages/routes stubbed for every screen: admin login, admin product list, admin product editor, public catalog, public product page.

## Phase 2 — Backend core

- JWT auth using an access+refresh token pattern: short-lived access token (used to authorize admin requests) plus a longer-lived refresh token (used only to mint new access tokens); login issues both, logout revokes/clears the refresh token, middleware/guard protects all admin routes and admin API endpoints and transparently refreshes an expired access token via the refresh token.
- Seed script: one test admin account, three demo products (at least one `draft`, one `published`).
- Admin product API: read + update only (no create/delete, per spec), only reachable when authenticated.
- Public product API: published-only; drafts return not-found via both direct URL and API.
- Server-side Zod validation mirroring editor limits (description ≤1000 chars, SEO title ≤60, SEO description ≤160, all three non-empty); invalid data rejected even via direct API calls.

## Phase 3 — Design

- Design all screens/states (desktop + mobile) in Figma using Claude Design: admin login, product list, product editor (including validation/error/saving states), public catalog, public product page.
- Transfer the design into shadcn/ui-based Next.js components with AI assistance.
- Record the design link/export and confirm the transfer in AI-WORKLOG.md.

## Phase 4 — UI implementation

- Wire the designed components into the placeholder pages.
- Admin list: shows name + status, links to editor.
- Admin editor: edits description/SEO/status only (name & characteristics read-only); clear save/loading/error states; a failed save neither loses the user's edits nor is shown as successful.
- Public catalog: published products only, links to product pages.
- Public product page: name, characteristics, description; SEO fields drive page `<title>`/meta description; product content rendered as data, never executed as code (no raw HTML injection of user content).
- Responsive layout across desktop and mobile.

## Phase 5 — Automated tests

- Unit tests (no DB): validation rules, status/visibility rules, auth/token checks — core business logic isolated from framework glue.
- Integration tests: API routes exercised against a real ephemeral PostgreSQL instance via `testcontainers` (no external services, no cloud dependency, no API keys required to run). Cover critical scenarios: save validation (including direct/invalid API calls), draft invisibility on public catalog/API, auth gating of admin routes.
- Document the testing strategy and rationale in README.md.

## Phase 6 — Docs pass

- Finalize README.md: setup/run/test instructions, test admin credentials, architecture notes, known limitations, actual time spent.
- Ensure AI-WORKLOG.md is up to date, including the required notable-AI-decision examples and test-verification notes.

## Phase 7 — Bonus tasks (separate budget)

Tackled in this order after core is solid:

1. **Infrastructure** — extend Docker Compose to run the full stack (Postgres + Next.js), add CI (GitHub Actions: lint, test, build).
2. **LLM integration** — OpenAI-backed generation of description/SEO suggestions in Ukrainian from name + characteristics, respecting editor limits; user can preview/reject/apply/edit; generation never saves/publishes or clobbers unsaved edits; mock mode is the default so reviewers don't need an API key, real-mode verification notes recorded in README/AI-WORKLOG.
3. **Shopify import** — import a product from a test Shopify store via API into the app's DB, visible in the editor.

Design Tools bonus is folded into Phase 3 rather than deferred, since the core UI (Phase 4) depends on it.

## Notes

- This file captures the agreed _order and scope_ of work. Any change to strategic decisions (stack, architecture principles, logging policy) is made in AGENTS.md, not here.
- Progress against these phases, actual time spent, and any incomplete parts are tracked in README.md as implementation proceeds.
