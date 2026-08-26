import type { Migration } from "./types.js";

export const migration: Migration = {
  version: 2,
  up: (db) => {
    try {
      db.exec(`ALTER TABLE audit_logs ADD COLUMN actorIdentity TEXT;`);
    } catch (e: any) {
      if (!e.message.includes("duplicate column")) throw e;
    }

    try {
      db.exec(
        `ALTER TABLE pending_approvals ADD COLUMN requesterIdentity TEXT;`,
      );
    } catch (e: any) {
      if (!e.message.includes("duplicate column")) throw e;
    }
  },
  down: (db) => {
    // SQLite doesn't support DROP COLUMN directly in older versions,
    // but modern SQLite does. We'll attempt it if supported.
    try {
      db.exec(`ALTER TABLE audit_logs DROP COLUMN actorIdentity;`);
      db.exec(`ALTER TABLE pending_approvals DROP COLUMN requesterIdentity;`);
    } catch (e: any) {
      console.warn("Could not drop columns in down migration", e.message);
    }
  },
};
