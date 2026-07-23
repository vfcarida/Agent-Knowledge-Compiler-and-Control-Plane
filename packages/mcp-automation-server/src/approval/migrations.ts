import type Database from "better-sqlite3";

import { migrations } from "./migrations/index.js";

export function runMigrations(db: Database.Database) {
  const currentVersionObj = db.prepare("PRAGMA user_version").get() as
    { user_version?: number } | undefined;
  const currentVersion = currentVersionObj?.user_version ?? 0;

  const pendingMigrations = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  if (pendingMigrations.length === 0) {
    return; // Up to date
  }

  // Run migrations in a transaction
  const runTransaction = db.transaction(() => {
    for (const migration of pendingMigrations) {
      // eslint-disable-next-line no-console
      console.log(`[Database] Applying migration v${migration.version}...`);
      migration.up(db);
      db.prepare(`PRAGMA user_version = ${migration.version}`).run();
    }
  });

  runTransaction();
}
