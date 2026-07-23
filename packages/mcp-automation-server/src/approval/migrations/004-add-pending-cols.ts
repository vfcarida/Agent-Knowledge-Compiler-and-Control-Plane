import type { Migration } from "./types.js";

export const migration: Migration = {
  version: 4,
  up: (db) => {
    const pendingCols = [
      "requestId TEXT",
      "capabilityId TEXT",
      "riskLevel TEXT",
      "sideEffectLevel TEXT",
      "requestedBy TEXT",
      "approvedBy TEXT",
      "createdAt INTEGER",
      "consumedAt INTEGER",
      "auditEventIds TEXT"
    ];
    for (const col of pendingCols) {
      try {
        db.exec(`ALTER TABLE pending_approvals ADD COLUMN ${col};`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (!e.message.includes("duplicate column")) throw e;
      }
    }
  },
  down: (db) => {
    const pendingCols = [
      "requestId",
      "capabilityId",
      "riskLevel",
      "sideEffectLevel",
      "requestedBy",
      "approvedBy",
      "createdAt",
      "consumedAt",
      "auditEventIds"
    ];
    for (const col of pendingCols) {
      try {
        db.exec(`ALTER TABLE pending_approvals DROP COLUMN ${col};`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch(e: any) {
        console.warn("Could not drop column in down migration", e.message);
      }
    }
  }
};
