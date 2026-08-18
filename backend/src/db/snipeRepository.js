const { isUniqueConstraintError } = require('./client');

function toSnipe(row) {
  if (!row) return null;
  return {
    id: row.id,
    gameId: row.game_id,
    sniperId: row.sniper_id,
    victimId: row.victim_id,
    groupmeMessageId: row.groupme_message_id,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    undone: Boolean(row.undone),
    undoneAt: row.undone_at,
  };
}

function createSnipeRepository(db) {
  const insertStmt = db.prepare(`
    INSERT INTO snipes (game_id, sniper_id, victim_id, groupme_message_id, image_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  const findByIdStmt = db.prepare('SELECT * FROM snipes WHERE id = ?');
  const findByMessageIdStmt = db.prepare('SELECT * FROM snipes WHERE groupme_message_id = ?');
  const undoStmt = db.prepare(
    "UPDATE snipes SET undone = 1, undone_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  );
  const killCountsStmt = db.prepare(
    'SELECT sniper_id AS playerId, COUNT(*) AS count FROM snipes WHERE game_id = ? AND undone = 0 GROUP BY sniper_id',
  );
  const deathCountsStmt = db.prepare(
    'SELECT victim_id AS playerId, COUNT(*) AS count FROM snipes WHERE game_id = ? AND undone = 0 GROUP BY victim_id',
  );
  const recentStmt = db.prepare(`
    SELECT
      s.*,
      sniper.display_name AS sniper_name,
      victim.display_name AS victim_name,
      g.name AS game_name
    FROM snipes s
    JOIN players sniper ON sniper.id = s.sniper_id
    JOIN players victim ON victim.id = s.victim_id
    JOIN games g ON g.id = s.game_id
    ORDER BY s.created_at DESC
    LIMIT ?
  `);

  return {
    create({ gameId, sniperId, victimId, groupmeMessageId, imageUrl }) {
      try {
        const result = insertStmt.run(gameId, sniperId, victimId, groupmeMessageId, imageUrl || null);
        return toSnipe(findByIdStmt.get(result.lastInsertRowid));
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          return null;
        }
        throw err;
      }
    },
    findByMessageId(groupmeMessageId) {
      return toSnipe(findByMessageIdStmt.get(groupmeMessageId));
    },
    undo(id) {
      const result = undoStmt.run(id);
      if (result.changes === 0) {
        const err = new Error('Snipe not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      return toSnipe(findByIdStmt.get(id));
    },
    killCountsByGame(gameId) {
      return killCountsStmt.all(gameId);
    },
    deathCountsByGame(gameId) {
      return deathCountsStmt.all(gameId);
    },
    recent(limit) {
      return recentStmt.all(limit).map((row) => ({
        ...toSnipe(row),
        sniperName: row.sniper_name,
        victimName: row.victim_name,
        gameName: row.game_name,
      }));
    },
  };
}

module.exports = { createSnipeRepository };
