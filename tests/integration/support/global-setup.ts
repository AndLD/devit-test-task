import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { startContainer } from "./db-container";
import { DB_URL_FILE } from "./constants";

// Runs once before any integration test file. Starts a real, disposable
// Postgres via testcontainers (see AGENTS.md — integration tests must never
// mock the DB layer), applies the Prisma migrations against it, then hands
// the connection string to test files via a temp file: Jest's globalSetup
// runs in a different scope than test workers, so process.env set here
// wouldn't otherwise be visible to them (see setup-env.ts).
export default async function globalSetup(): Promise<void> {
  const databaseUrl = await startContainer();
  writeFileSync(DB_URL_FILE, databaseUrl, "utf-8");

  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
}
