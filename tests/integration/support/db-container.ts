import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

// Module-level so globalSetup and globalTeardown (which Jest runs in the
// same process for a single run) can share the container reference without
// persisting it anywhere on disk.
let container: StartedPostgreSqlContainer | undefined;

export async function startContainer(): Promise<string> {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  return container.getConnectionUri();
}

export async function stopContainer(): Promise<void> {
  await container?.stop();
  container = undefined;
}
