import Database from "better-sqlite3";
import path from "path";
import { mkdirSync, existsSync } from "fs";
import { createSchema, seedIfEmpty, seedBankingCourse } from "./schema.js";

const DB_PATH = path.join(process.cwd(), "data", "lms.db");

// Global singleton — safe across Next.js HMR hot reloads
const g = globalThis;

export function getDb() {
  if (!g._lmsDb) {
    const dir = path.join(process.cwd(), "data");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    createSchema(db);
    seedIfEmpty(db);
    seedBankingCourse(db);

    g._lmsDb = db;
  }
  return g._lmsDb;
}
