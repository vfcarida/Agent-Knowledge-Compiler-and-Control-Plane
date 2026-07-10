import type Database from 'better-sqlite3';

interface Migration {
  version: number;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
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
    }
  },
  {
    version: 2,
    up: (db) => {
      // Add actorIdentity to audit_logs and requesterIdentity to pending_approvals
      // We wrap in a try-catch for SQLite versions or existing setups that might fail if column already exists
      try {
        db.exec(`ALTER TABLE audit_logs ADD COLUMN actorIdentity TEXT;`);
      } catch (e: any) {
        if (!e.message.includes('duplicate column')) throw e;
      }

      try {
        db.exec(`ALTER TABLE pending_approvals ADD COLUMN requesterIdentity TEXT;`);
      } catch (e: any) {
        if (!e.message.includes('duplicate column')) throw e;
      }
    }
  }
];

export function runMigrations(db: Database.Database) {
  const currentVersionObj = db.prepare('PRAGMA user_version').get() as { user_version: number };
  const currentVersion = currentVersionObj.user_version;

  const pendingMigrations = migrations.filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version);

  if (pendingMigrations.length === 0) {
    return; // Up to date
  }

  // Run migrations in a transaction
  const runTransaction = db.transaction(() => {
    for (const migration of pendingMigrations) {
      console.log(`[Database] Applying migration v${migration.version}...`);
      migration.up(db);
      db.prepare(`PRAGMA user_version = ${migration.version}`).run();
    }
  });

  runTransaction();
}
