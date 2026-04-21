import path from "node:path";

const SQLITE_FILE_PREFIX = "file:";
const DEFAULT_DATABASE_FILE = path.join(process.cwd(), "dev.db");

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith(SQLITE_FILE_PREFIX)) {
    return databaseUrl;
  }

  if (databaseUrl === "file:./dev.db" || databaseUrl === "file:dev.db") {
    return `${SQLITE_FILE_PREFIX}${DEFAULT_DATABASE_FILE}`;
  }

  return databaseUrl;
}
