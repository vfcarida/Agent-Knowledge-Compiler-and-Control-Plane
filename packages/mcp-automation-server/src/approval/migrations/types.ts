import type Database from "better-sqlite3";

export interface Migration {
  version: number;

  up: (db: Database.Database) => void;

  down?: (db: Database.Database) => void;
}
