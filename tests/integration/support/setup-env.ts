import { readFileSync } from "node:fs";
import { DB_URL_FILE } from "./constants";

// Runs once per test file, before it's loaded — so process.env is set
// before any test module imports src/server/db/client.ts (which reads
// DATABASE_URL at import time to construct the Prisma driver adapter).
process.env.DATABASE_URL = readFileSync(DB_URL_FILE, "utf-8").trim();

// Fixed test-only secrets so integration tests are hermetic and don't
// depend on a local .env file.
process.env.JWT_ACCESS_SECRET = "integration-test-access-secret";
process.env.JWT_REFRESH_SECRET = "integration-test-refresh-secret";
