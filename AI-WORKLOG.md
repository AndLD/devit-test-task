# AI Work Log

This log records how AI tools were used throughout the development of Product Content Studio, per the task requirements and the logging policy in [AGENTS.md](AGENTS.md#logging-to-ai-worklogmd).

## Tools & models used

| Tool | Model(s) | Role |
|---|---|---|
| Claude Code | Sonnet 5 (`claude-sonnet-5`) | Primary AI pair-programmer: planning, scaffolding, implementation, tests, docs |
| Claude Design | — | Figma-based UI design for the Design Tools bonus |
| _(fill in others as used, e.g. Cursor/Copilot autocompletion)_ | | |

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

<!-- Further entries appended below as implementation proceeds. -->
