const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * Opens (creating if necessary) a SQLite database at `filename` and applies
 * the schema. `filename` may also be ':memory:' for tests.
 */
function openDatabase(filename) {
  if (filename !== ':memory:') {
    const dir = path.dirname(filename);
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  return db;
}

/**
 * Runs `fn` inside a SQLite transaction, committing on success and rolling
 * back if `fn` throws. `fn` must be synchronous (node:sqlite is a
 * synchronous API) — that's fine, since SQLite operations are effectively
 * instantaneous for a proof-of-concept's data volume.
 */
function withTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function isUniqueConstraintError(err) {
  return Boolean(err) && err.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(err.message || '');
}

module.exports = { openDatabase, withTransaction, isUniqueConstraintError };