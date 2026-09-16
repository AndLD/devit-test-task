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

<!-- Further entries appended below as implementation proceeds. -->
