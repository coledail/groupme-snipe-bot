const fs = require('fs');
const path = require('path');

const SQLITE_SCHEMA_PATH = path.join(__dirname, '..', '..', 'schema.sql');
const PG_SCHEMA_PATH = path.join(__dirname, '..', '..', 'schema_postgres.sql');

async function openDatabase(filenameOrUrl) {
  // If a DATABASE_URL is provided in env, use Postgres (pg Pool).
  const databaseUrl = process.env.DATABASE_URL || null;
  if (databaseUrl) {
    // Postgres
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    // Apply schema (idempotent) on startup
    const schema = fs.readFileSync(PG_SCHEMA_PATH, 'utf8');
    // Split statements to avoid trying to run empty final statement
    await pool.query(schema);
    return pool;
  }

  // Fallback to SQLite synchronous DB for local/dev
  const { DatabaseSync } = require('node:sqlite');
  if (filenameOrUrl !== ':memory:') {
    const dir = path.dirname(filenameOrUrl);
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(filenameOrUrl);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  const schema = fs.readFileSync(SQLITE_SCHEMA_PATH, 'utf8');
  db.exec(schema);
  return db;
}

async function withTransaction(db, fn) {
  // If using pg Pool
  if (db && typeof db.connect === 'function') {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // SQLite (synchronous)
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
  if (!err) return false;
  if (err.code === '23505') return true; // Postgres unique violation
  return err.code === 'ERR_SQLITE_ERROR' && /UNIQUE constraint failed/.test(err.message || '');
}

module.exports = { openDatabase, withTransaction, isUniqueConstraintError };
