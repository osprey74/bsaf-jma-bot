import Database from "better-sqlite3";
import { logger } from "../utils/logger.js";

export class DedupStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS posted_entries (
        entry_id TEXT PRIMARY KEY,
        posted_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    // Clean up entries older than 7 days on startup
    this.db.exec(`
      DELETE FROM posted_entries
      WHERE posted_at < datetime('now', '-7 days')
    `);
    logger.info("DEDUP", `Initialized: ${dbPath}`);
  }

  /** Returns true if this entry has already been posted. */
  has(entryId: string): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM posted_entries WHERE entry_id = ?")
      .get(entryId);
    return row !== undefined;
  }

  /** Mark an entry as posted. */
  add(entryId: string): void {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO posted_entries (entry_id) VALUES (?)"
      )
      .run(entryId);
  }

  close(): void {
    this.db.close();
  }
}
