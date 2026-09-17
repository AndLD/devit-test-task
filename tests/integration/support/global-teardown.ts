import { unlinkSync } from "node:fs";
import { stopContainer } from "./db-container";
import { DB_URL_FILE } from "./constants";

export default async function globalTeardown(): Promise<void> {
  await stopContainer();
  try {
    unlinkSync(DB_URL_FILE);
  } catch {
    // Already gone — nothing to clean up.
  }
}
