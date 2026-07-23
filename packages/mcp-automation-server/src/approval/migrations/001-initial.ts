import type { Migration } from "./types.js";

export const migration: Migration = {
  version: 1,
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_approvals (
        token TEXT PRIMARY KEY,
        toolName TEXT NOT NULL,
        payloadHash TEXT NOT NULL,
        expiresAt INTEGER NOT NULL,
        metadata TEXT
      );
      
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        action TEXT NOT NULL,
        toolName TEXT NOT NULL,
        payloadHash TEXT NOT NULL,
        metadata TEXT
      );
    `);
  },
  down: (db) => {
    db.exec(`
      DROP TABLE IF EXISTS pending_approvals;
      DROP TABLE IF EXISTS audit_logs;
    `);
  }
};
