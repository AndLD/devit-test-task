import { join } from "node:path";
import { tmpdir } from "node:os";

export const DB_URL_FILE = join(tmpdir(), "product-content-studio-test-db-url");
