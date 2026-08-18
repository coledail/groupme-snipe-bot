const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'schema.sql');

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
