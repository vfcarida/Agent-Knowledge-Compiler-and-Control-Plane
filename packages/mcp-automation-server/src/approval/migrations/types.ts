import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  // eslint-disable-next-line no-unused-vars
  up: (db: Database.Database) => void;
  // eslint-disable-next-line no-unused-vars
  down?: (db: Database.Database) => void;
}
