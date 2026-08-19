function toGame(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

function createGameRepository(db) {
  const isPg = db && typeof db.query === 'function';

  return {
    async getActive() {
      if (isPg) {
        const res = await db.query('SELECT * FROM games WHERE active = true LIMIT 1');
        return toGame(res.rows[0]);
      }
      const findActiveStmt = db.prepare('SELECT * FROM games WHERE active = 1 LIMIT 1');
      return toGame(findActiveStmt.get());
    },
    async createActive(name) {
      if (isPg) {
        await db.query('UPDATE games SET active = false WHERE active = true');
        const res = await db.query('INSERT INTO games (name, active) VALUES ($1, true) RETURNING *', [name]);
        return toGame(res.rows[0]);
      }
      const createStmt = db.prepare('INSERT INTO games (name, active) VALUES (?, 1)');
      const deactivateStmt = db.prepare('UPDATE games SET active = 0 WHERE active = 1');
      const findByIdStmt = db.prepare('SELECT * FROM games WHERE id = ?');
      deactivateStmt.run();
      const result = createStmt.run(name);
      return toGame(findByIdStmt.get(result.lastInsertRowid));
    },
    async listAll() {
      if (isPg) {
        const res = await db.query('SELECT * FROM games ORDER BY created_at DESC');
        return res.rows.map(toGame);
      }
      const listAllStmt = db.prepare('SELECT * FROM games ORDER BY created_at DESC');
      return listAllStmt.all().map(toGame);
    },
    async activate(gameId) {
      if (isPg) {
        const existing = await db.query('SELECT * FROM games WHERE id = $1', [gameId]);
        if (existing.rowCount === 0) {
          const err = new Error('Game not found');
          err.code = 'P2025';
          throw err;
        }
        await db.query('UPDATE games SET active = false WHERE active = true');
        await db.query('UPDATE games SET active = true WHERE id = $1', [gameId]);
        const res = await db.query('SELECT * FROM games WHERE id = $1', [gameId]);
        return toGame(res.rows[0]);
      }
      const findByIdStmt = db.prepare('SELECT * FROM games WHERE id = ?');
      const deactivateStmt = db.prepare('UPDATE games SET active = 0 WHERE active = 1');
      const activateStmt = db.prepare('UPDATE games SET active = 1 WHERE id = ?');
      const game = findByIdStmt.get(gameId);
      if (!game) {
        const err = new Error('Game not found');
        err.code = 'P2025';
        throw err;
      }
      deactivateStmt.run();
      activateStmt.run(gameId);
      return toGame(findByIdStmt.get(gameId));
    },
    async create(name) {
      if (isPg) {
        const res = await db.query('INSERT INTO games (name, active) VALUES ($1, false) RETURNING *', [name]);
        return toGame(res.rows[0]);
      }
      const createStmt = db.prepare('INSERT INTO games (name, active) VALUES (?, 1)');
      const findByIdStmt = db.prepare('SELECT * FROM games WHERE id = ?');
      const result = createStmt.run(name);
      return toGame(findByIdStmt.get(result.lastInsertRowid));
    },
  };
}

module.exports = { createGameRepository };
