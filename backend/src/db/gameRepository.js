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
  const createStmt = db.prepare('INSERT INTO games (name, active) VALUES (?, 1)');
  const deactivateStmt = db.prepare('UPDATE games SET active = 0 WHERE active = 1');
  const findActiveStmt = db.prepare('SELECT * FROM games WHERE active = 1 LIMIT 1');
  const findByIdStmt = db.prepare('SELECT * FROM games WHERE id = ?');
  const listAllStmt = db.prepare('SELECT * FROM games ORDER BY created_at DESC');
  const activateStmt = db.prepare('UPDATE games SET active = 1 WHERE id = ?');

  return {
    getActive() {
      return toGame(findActiveStmt.get());
    },
    createActive(name) {
      // deactivate previous
      deactivateStmt.run();
      const result = createStmt.run(name);
      return toGame(findByIdStmt.get(result.lastInsertRowid));
    },
    listAll() {
      return listAllStmt.all().map(toGame);
    },
    activate(gameId) {
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
    create(name) {
      const result = createStmt.run(name);
      return toGame(findByIdStmt.get(result.lastInsertRowid));
    },
  };
}

module.exports = { createGameRepository };
