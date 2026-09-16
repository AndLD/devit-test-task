# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

This file is the single source of truth for **strategic decisions** on this project. Any AI coding agent (Claude Code, Cursor, Codex, Copilot, etc.) working in this repo must read this file first and follow it. When a new strategic decision is made during the project, it must be appended here (not just mentioned in chat) before or as part of the implementation that depends on it.

## Project

**Product Content Studio** — a small product-card editor for an online store. Admin panel (auth-protected) to edit description/SEO fields and publish products; public catalog + product pages showing only published products. See [PROJECT-REQUIREMENTS.md](PROJECT-REQUIREMENTS.md) for the full task spec (Ukrainian).

## Chosen technology stack

Where the requirements offered a choice, these are the decisions — do not substitute alternatives without updating this section:

| Concern            | Choice                                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js (App Router)                                                                                                                                                                                              |
| Language           | TypeScript                                                                                                                                                                                                        |
| ORM                | Prisma                                                                                                                                                                                                            |
| Database           | PostgreSQL                                                                                                                                                                                                        |
| Validation         | Zod                                                                                                                                                                                                               |
| Auth               | JWT (custom, not a third-party auth provider), access+refresh token pattern: short-lived access token authorizes admin requests, longer-lived refresh token only mints new access tokens and is revoked on logout |
| UI library         | shadcn/ui (on top of Tailwind)                                                                                                                                                                                    |
| Package manager    | npm                                                                                                                                                                                                               |
| Linting/formatting | ESLint + Prettier                                                                                                                                                                                                 |
| Test runner        | Jest                                                                                                                                                                                                              |
| Test DB strategy   | Dockerized ephemeral PostgreSQL via `testcontainers` (real Postgres engine, spun up per test run, no cloud dependency, no API keys)                                                                               |
| Bonus LLM provider | OpenAI API (real mode), with a mocked/simulated response mode as the default so reviewers can run without an API key                                                                                              |
| Infra bonus        | Docker Compose (Postgres in Docker from day one; Next.js runs locally/un-dockerized during development) + CI (GitHub Actions: lint, test, build)                                                                  |
| Design bonus       | Figma design (all screens/states, desktop+mobile) via Claude Design, transferred to shadcn/ui-based Next.js components with AI assistance                                                                         |

## Architectural principles

- **SOLID principles** apply across the codebase — single-responsibility modules/services, dependency inversion at boundaries (e.g. repository/service layers behind interfaces), no god-objects.
- **Low coupling, no cyclic dependencies.** Layers should have a clear one-directional dependency graph (e.g. `routes/handlers → services → repositories → prisma client`; `ui components → hooks → api client`). Domain/business logic must not import from framework-specific or UI-specific layers.
- **High testability.** Core business logic (validation rules, product status transitions, auth checks, field length limits, publish/draft visibility rules) must be isolated from framework glue so it can be unit-tested without spinning up Next.js or HTTP. Integration tests exercise API routes against a real ephemeral Postgres instance (via `testcontainers`), never mocked at the DB layer for those tests.
- Prefer composition over inheritance; prefer small pure functions for business rules.
- Secrets (DB credentials, JWT secret, LLM API keys) live only in environment variables, never committed, never sent to the client. `.env.example` documents required variables without real values.

## Time budget

- Core functionality + tests: **6–8 hours** (per task requirements). Actual time spent and any incomplete parts must be recorded in README.md.
- Bonus tasks: **not** counted against the core budget; treated as a separate ~2–3 hour allotment. Bonuses are optional for acceptance — if time runs out, whichever bonus was in progress is left documented as incomplete in AI-WORKLOG.md/README.md rather than half-wired into the core app.

## Development order (high level)

1. **Scaffolding & non-UI groundwork** (no design dependency): Next.js project setup, Prisma schema, `docker-compose.yml` (Postgres only — Next.js runs locally during dev), env config (`.env.example`), core TS types, Zod schemas, base project structure honoring the architecture above. Placeholder pages/routes stubbed for every screen the app needs (admin login, admin product list, admin product editor, public catalog, public product page).
2. **Backend core**: JWT auth (access+refresh token pattern — login/logout, protected admin routes/middleware, transparent access-token refresh), seed script (test admin + 3 demo products, one draft + one published), admin product API (read/update only — no create/delete per spec), public product API (published-only, draft never reachable), server-side validation with Zod mirroring the editor limits (description ≤1000, SEO title ≤60, SEO description ≤160, all non-empty).
3. **Design phase**: Figma design covering all screens/states (desktop + mobile) via Claude Design, then transferred into shadcn/ui-based Next.js components with AI assistance. Documented in AI-WORKLOG.md with confirmation of the transfer.
4. **UI implementation**: wire the designed components into the placeholder pages — admin list/editor with save states and error handling that never silently loses edits or shows a failed save as successful; public catalog and product page with SEO meta tags sourced from the product's SEO fields; responsive desktop/mobile layout.
5. **Automated tests**: unit tests for core business logic (validation, status/visibility rules, auth checks) run without a DB; integration tests for API routes against a `testcontainers` Postgres instance covering the critical scenarios (save validation, draft invisibility, auth gating). Test strategy and rationale documented in README.md.
6. **Docs pass**: finalize README.md (setup, run, test, login), keep AI-WORKLOG.md current.
7. **Bonus tasks** (own time budget, roughly in this order): Infrastructure (Docker Compose is already in place from step 1 — extend to full-stack compose + CI pipeline), LLM integration (OpenAI-backed suggestion generation for description/SEO fields, mock mode default, real mode documented), Shopify import.

Any deviation from this order, or a new strategic decision made mid-implementation, must be reflected in this file.

## Git workflow

This repo follows a lightweight Git Flow. Any AI coding agent making commits must follow it — do not commit phase/feature work directly to `main` or `develop`.

- **`main`** — production-ready snapshots only. It only receives merges from `develop` at meaningful milestones (e.g. "core functionality complete", final submission), never direct commits and never a feature branch merged straight in.
- **`develop`** — integration branch for in-progress work. This is the default base for new branches and the target for phase PRs.
- **Phase/feature branches** — one branch per development phase (or bonus task), branched from `develop`, named `phase-<n>-<short-slug>` for the numbered phases in [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md) (e.g. `phase-2-backend-core`, `phase-3-design`) or `bonus-<slug>` for bonus work (e.g. `bonus-llm-integration`). All commits for that phase land here.
- **Pull requests** — when a phase branch is complete (builds, lints, and its tests pass), open a PR into `develop`, not `main`. Merge `develop` into `main` only at a release milestone, via its own PR.
- Keep phase branches scoped to their phase — don't bundle unrelated phases into one branch/PR, so review and AI-WORKLOG entries map cleanly to what shipped.

## Logging to AI-WORKLOG.md

AI-WORKLOG.md tracks AI tool usage and decisions across the project, as required by the task. Every AI coding agent working in this repo must:

- Add an entry **as work happens**, not only at the end of the project — log at the end of each meaningful work session or feature slice, not per individual file edit.
- Use the entry template already present in AI-WORKLOG.md (date, tool/model, task, AI contribution vs. candidate's own contribution, verification performed).
- Explicitly call out the 2–3 "notable AI decision" examples required by the task requirements as they occur (not retrofitted at the end) — include a short code/diff snippet or a link to the relevant commit/file.
- Note when generated code was reviewed, modified, or rejected, and why — this is evidence of judgment, not just usage.
- Record how automated tests were used to verify AI-generated code, and any quality assessment of AI-generated tests themselves.
- Never log secrets, API keys, or credentials — the file is part of the repository.
