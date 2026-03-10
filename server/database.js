import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Database Configuration ─────────────────────────────────────────────────
// Current: SQLite (better-sqlite3)
// Future:  Amazon RDS (PostgreSQL) via 'pg' package
//
// To migrate to RDS, set these environment variables:
//   DB_TYPE=postgres
//   DATABASE_URL=postgres://user:password@host:5432/urbanpalm
//
// Then install the pg package:
//   npm install pg
//
// The createConnection() function below will need to return a pg Pool instead.
// All route files use db.prepare().get/all/run() — those calls will need to be
// converted to async pool.query() calls when switching to PostgreSQL.
//
// Key SQLite → PostgreSQL differences to handle during migration:
//   - INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
//   - TEXT → VARCHAR or TEXT
//   - REAL → NUMERIC or DOUBLE PRECISION
//   - datetime('now') → NOW() or CURRENT_TIMESTAMP
//   - ? placeholders → $1, $2, ... numbered placeholders
//   - db.prepare(sql).get(...args) → await pool.query(sql, args) → rows[0]
//   - db.prepare(sql).all(...args) → await pool.query(sql, args) → rows
//   - db.prepare(sql).run(...args) → await pool.query(sql, args) → rowCount
//   - db.transaction(fn) → BEGIN/COMMIT/ROLLBACK with pool.connect()
//   - db.exec(sql) → await pool.query(sql)
//   - db.pragma(...) → SET commands or connection options
//   - result.lastInsertRowid → use RETURNING id in INSERT statements
//   - PRAGMA table_info → information_schema.columns
//   - ON CONFLICT(key) DO UPDATE → ON CONFLICT (key) DO UPDATE (same syntax)
// ─────────────────────────────────────────────────────────────────────────────

const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // eslint-disable-line no-undef
const DATABASE_URL = process.env.DATABASE_URL;    // eslint-disable-line no-undef

function createConnection() {
  if (DB_TYPE === 'postgres') {
    // ── Future RDS Implementation ──────────────────────────────────────────
    // import pg from 'pg';
    // const pool = new pg.Pool({
    //   connectionString: DATABASE_URL,
    //   ssl: { rejectUnauthorized: false }, // Required for RDS
    //   max: 20,                           // Connection pool size
    //   idleTimeoutMillis: 30000,
    //   connectionTimeoutMillis: 5000,
    // });
    // return pool;
    throw new Error(
      'PostgreSQL support is planned but not yet implemented. ' +
      'Set DB_TYPE=sqlite or remove DB_TYPE to use SQLite.'
    );
  }

  // ── Current SQLite Implementation ──────────────────────────────────────
  const dbPath = DATABASE_URL || join(__dirname, 'urbanpalm.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

const db = createConnection();

export { DB_TYPE, DATABASE_URL };
export default db;
