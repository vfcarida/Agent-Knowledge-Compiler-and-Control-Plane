import type { Migration } from "./types.js";
import { migration as m001 } from "./001-initial.js";
import { migration as m002 } from "./002-add-identities.js";
import { migration as m003 } from "./003-add-status.js";
import { migration as m004 } from "./004-add-pending-cols.js";

export const migrations: Migration[] = [
  m001,
  m002,
  m003,
  m004
];
