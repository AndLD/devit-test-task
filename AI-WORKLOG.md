# AI Work Log

This log records how AI tools were used throughout the development of Product Content Studio, per the task requirements and the logging policy in [AGENTS.md](AGENTS.md#logging-to-ai-worklogmd).

## Tools & models used

| Tool                                                           | Model(s)                     | Role                                                                           |
| -------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| Claude Code                                                    | Sonnet 5 (`claude-sonnet-5`) | Primary AI pair-programmer: planning, scaffolding, implementation, tests, docs |
| Claude Design                                                  | —                            | Figma-based UI design for the Design Tools bonus                               |
| _(fill in others as used, e.g. Cursor/Copilot autocompletion)_ |                              |                                                                                |

## How to read this log

Entries are appended chronologically (oldest first) as work happens — see [AGENTS.md](AGENTS.md) for the logging policy. Each entry follows this template:

```
### YYYY-MM-DD — <short title>

- **Task:** what was being worked on
- **AI contribution:** what the AI tool produced/suggested
- **My contribution:** what I decided, changed, reviewed, or wrote myself
- **Verification:** how it was checked (tests run, manual check, code review)
- **Reference:** commit hash / file / PR link (if applicable)
```

Notable AI-code decisions (the 2–3 examples required by the task) are marked with **⭐ Notable decision** so they're easy to find.

---

## Entries

### 2026-09-16 — Planning: stack, architecture, and development order

- **Task:** Kick off the project by reading PROJECT-REQUIREMENTS.md, choosing technologies from the options offered, and defining strategic decisions (architecture principles, test strategy, bonus scope/order) before any code is written.
- **AI contribution:** Claude Code read the requirements, proposed a set of clarifying questions on ambiguous/bonus-scope points (bonus time budget & priority order, test-DB strategy, LLM provider for the bonus, Design Tools bonus approach), and drafted the initial [AGENTS.md](AGENTS.md), this AI-WORKLOG.md, and the README.md skeleton based on the answers.
- **My contribution:** Chose the core stack (Next.js, Prisma, Zod, PostgreSQL, JWT, npm, shadcn/ui, Prettier+ESLint, Jest), answered the clarifying questions (bonus tasks get their own ~2–3h budget separate from the 6–8h core budget; testcontainers over pg-mem/SQLite for test DB fidelity; OpenAI for the bonus LLM integration; Figma design via Claude Design for the Design Tools bonus), and approved the resulting plan.
- **Verification:** N/A (planning only, no code yet).
- **Reference:** [AGENTS.md](AGENTS.md)

### 2026-09-16 — Phase 1: scaffolding

- **Task:** Execute Phase 1 of [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md): Next.js + TS project setup, Prisma schema, Docker Compose (Postgres), env config, shared Zod schemas/types, layered folder structure, and placeholder pages for every screen.
- **AI contribution:** Claude Code scaffolded the Next.js app (`create-next-app`) and shadcn/ui, wrote `prisma/schema.prisma` (`AdminUser`, `RefreshToken`, `Product`), `docker-compose.yml`, `.env.example`, the Zod validation schema for the editable product fields, the domain `Product` type, the Prisma client singleton, and all five placeholder route pages. It also diagnosed and fixed two environment issues (see notable decisions below) and verified the result by running `npm run build`, `npm run lint`, and a live `next dev` session with screenshots of all five routes.
- **My contribution:** Reviewed each generated file, decided to move `shadcn` from `dependencies` to `devDependencies` (it's a CLI, not a runtime dep), decided to keep only `.claude/skills` from Prisma's auto-generated skill files and drop the duplicate `.windsurf`/`.agents` copies (unused tools, pure clutter), and approved the driver-adapter and Node-version fixes below after seeing the reasoning.
- **Verification:** `npm run build` (typecheck + production build succeeds, all 5 routes present), `npm run lint` (no errors), and a manual pass through all 5 placeholder routes in a live `next dev` server with screenshots confirming each renders its expected placeholder content.
- **Reference:** [prisma/schema.prisma](prisma/schema.prisma), [docker-compose.yml](docker-compose.yml), [src/server/db/client.ts](src/server/db/client.ts)

**⭐ Notable decision 1 — Node version bump (20.14 → 22.21.1).** `npm install` kept failing with an unrelated-looking arborist crash (`Cannot read properties of null (reading 'edgesOut')`) on the environment's default Node 20.14. Root cause turned out to be that Prisma 7 requires Node `^20.19 || ^22.12 || >=24`, and the resolver choked before it could even report a clean engine error. Claude Code found Node 22.21.1 already installed via `nvm`, switched the project to it, and pinned it in `.nvmrc` and the README so the failure won't resurface for a reviewer running an older default Node. Verified by a clean `rm -rf node_modules package-lock.json && npm install` succeeding under 22.21.1.

**⭐ Notable decision 2 — Prisma 7 requires an explicit driver adapter.** After fixing the Node version, `npm install prisma @prisma/client` initially resolved `@prisma/client@8.0.0-rc.15` (a release-candidate pulled in because `prisma`'s dependency range was left unpinned) while `prisma` resolved to the stable `7.10.0` — a version mismatch between CLI and client. Claude Code pinned both to the same stable `7.10.0`. Separately, `next build`'s typecheck then failed because Prisma 7's generated client no longer accepts a bare `datasourceUrl` option — it requires an explicit driver adapter. Claude Code installed `@prisma/adapter-pg` + `pg` and wired `new PrismaPg({ connectionString: process.env.DATABASE_URL })` into the `PrismaClient` constructor in [src/server/db/client.ts](src/server/db/client.ts). Verified by `npx prisma migrate dev` applying successfully against the Docker Postgres instance and `npm run build` passing cleanly afterward.

**⭐ Notable decision 3 — Repo hygiene: pruning Prisma's auto-generated AI skill files.** `prisma init` (v7) auto-installed identical copies of its CLI/client-API skill docs into `.claude/skills/`, `.windsurf/skills/`, and `.agents/skills/`, plus a `skills-lock.json`. Since this project only uses Claude Code, keeping three duplicate copies was pure repo clutter with no benefit. Candidate decision: delete `.windsurf/` and `.agents/`, keep `.claude/skills/` (useful — it's real skill content for the tool actually in use) and `skills-lock.json` (needed for Prisma to track/update it). No functional verification needed; confirmed `prisma generate`/`migrate` still worked afterward.

### 2026-09-16 — Phase 2: backend core

- **Task:** Execute Phase 2 of [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md): JWT access+refresh auth (login/logout, protected admin routes, transparent refresh), a seed script (test admin + 3 demo products), the admin product API (read/update only), and the public product API (published-only, drafts unreachable), all server-side Zod-validated.
- **AI contribution:** Claude Code wrote the full auth stack (`src/server/auth/{passwords,tokens,cookies,guard}.ts`), repositories and services (`src/server/repositories/*`, `src/server/services/*`), all Route Handlers under `src/app/api/`, the Edge proxy (`src/proxy.ts`) that gates `/admin/*` pages, and `prisma/seed.ts`. It also caught and fixed a Next.js 16 deprecation warning during `npm run build` (`middleware` → `proxy` file convention) by reading `node_modules/next/dist/docs/.../proxy.md` and renaming the file/export accordingly, rather than leaving a deprecation warning in the build output.
- **My contribution:** Reviewed the access+refresh token design end-to-end (asked for and got an explanation of why refresh tokens are DB-backed — see the "why do we store refresh tokens" discussion), approved the `jose`-over-`jsonwebtoken` choice below, and manually exercised every endpoint (see verification) rather than trusting the code review alone.
- **Verification:** `npm run build`/`lint`/`tsc --noEmit` all clean. Then, against the real Docker Postgres instance with seeded data, manually exercised the full flow with `curl`: public catalog lists only published products; a draft's public detail route 404s (both by slug and — implicitly — by not appearing in the catalog); admin routes 401 without auth; login with a wrong password 401s; login succeeds and sets cookies; admin list/detail/update work once authenticated; an invalid update (description over 1000 chars) 400s and does not persist; a valid update flips a product from draft to published and it then appears in the public catalog; refresh-token rotation issues a new access token and immediately invalidates the previous refresh token; logout revokes the refresh token so a further refresh 401s; and `/admin/products` redirects to `/admin/login` (307) when unauthenticated while `/admin/login` itself stays reachable.
- **Reference:** [src/server/services/auth-service.ts](src/server/services/auth-service.ts), [src/proxy.ts](src/proxy.ts), [prisma/seed.ts](prisma/seed.ts)

**⭐ Notable decision 4 — `jose` instead of `jsonwebtoken`, and no DB access from the Edge proxy.** The access-token check that gates `/admin/*` pages needs to run in Next's Proxy/Middleware layer, which executes on the Edge runtime by default — a constrained environment without Node's `net`/TCP sockets, so a real DB-backed refresh-token rotation can't happen there. Claude Code chose `jose` (Web Crypto based, Edge-compatible) over the more commonly-known `jsonwebtoken` (Node-only) for all JWT signing/verification, and split the design so the proxy only ever does a stateless signature/expiry check and redirects to `/admin/login` on failure; the DB-backed refresh-token rotation lives entirely in `POST /api/admin/auth/refresh`, a Node-runtime Route Handler, called by the admin client whenever an API request 401s. This avoids forcing the whole app onto a Node-runtime middleware config just to keep one code path. Verified by the `curl` checks above (redirect behavior and refresh rotation both confirmed working).

### 2026-09-17 — Fix: public/admin product list type contracts

- **Task:** Fix a gap found while planning the public catalog: `ProductRepository.listPublished()` returned `{ id, name, status }` (the admin shape) instead of exposing `slug`, which the public product page routes by. Also address the user's forward-looking concern that a two-type split (admin vs. public list item) would mean updating field lists in two disconnected places as the app grows.
- **AI contribution:** Claude Code proposed two options — add `slug` to the existing shared type, or split into `AdminProductListItem`/`PublicProductListItem` — recommended the split for the security/coupling reasons in AGENTS.md, then addressed the follow-up "won't this double future work?" concern by deriving both types via `Pick<Product, ...>` from the single canonical `Product` type in `lib/types/product.ts`, rather than declaring them as independent interfaces. Updated `product-repository.ts`'s Prisma `select`s and `product-service.ts`'s return types to match.
- **My contribution:** Asked the original question (what actually differs between the admin list and public catalog) that surfaced the gap, chose the type-split approach over the simpler add-a-field option, and specifically pushed back on it with "we'll need more public fields later — how do we avoid double maintenance," which is what led to the `Pick`-derived design rather than two hand-duplicated interfaces.
- **Verification:** `npm run build`/`lint`/`tsc --noEmit` clean. Live-verified via `curl` against the real Docker Postgres instance: `GET /api/products` now returns exactly `{ slug, name }` per item (no `id`, no `status`); `GET /api/admin/products` (authenticated) is unchanged, still `{ id, name, status }`.
- **Reference:** [src/server/repositories/product-repository.ts](src/server/repositories/product-repository.ts), [src/server/services/product-service.ts](src/server/services/product-service.ts)

<!-- Further entries appended below as implementation proceeds. -->
