import type { Migration } from "./types.js";

export const migration: Migration = {
  version: 3,
  up: (db) => {
    try {
      db.exec(
        `ALTER TABLE pending_approvals ADD COLUMN status TEXT DEFAULT 'PENDING';`,
      );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (!e.message.includes("duplicate column")) throw e;
    }
  },
  down: (db) => {
    try {
      db.exec(`ALTER TABLE pending_approvals DROP COLUMN status;`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch(e: any) {
      console.warn("Could not drop columns in down migration", e.message);
    }
  }
};
