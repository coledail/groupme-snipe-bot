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
  const isPg = db && typeof db.query === 'function';

  return {
    async create({ gameId, sniperId, victimId, groupmeMessageId, imageUrl }) {
      if (isPg) {
        try {
          const res = await db.query(
            `INSERT INTO snipes (game_id, sniper_id, victim_id, groupme_message_id, image_url)
              VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [gameId, sniperId, victimId, groupmeMessageId, imageUrl || null],
          );
          return toSnipe(res.rows[0]);
        } catch (err) {
          if (isUniqueConstraintError(err)) return null;
          throw err;
        }
      }

      const insertStmt = db.prepare(`
        INSERT INTO snipes (game_id, sniper_id, victim_id, groupme_message_id, image_url)
        VALUES (?, ?, ?, ?, ?)
      `);
      const findByIdStmt = db.prepare('SELECT * FROM snipes WHERE id = ?');
      try {
        const result = insertStmt.run(gameId, sniperId, victimId, groupmeMessageId, imageUrl || null);
        return toSnipe(findByIdStmt.get(result.lastInsertRowid));
      } catch (err) {
        if (isUniqueConstraintError(err)) return null;
        throw err;
      }
    },
    async findByMessageId(groupmeMessageId) {
      if (isPg) {
        const res = await db.query('SELECT * FROM snipes WHERE groupme_message_id = $1 LIMIT 1', [groupmeMessageId]);
        return toSnipe(res.rows[0]);
      }
      const findByMessageIdStmt = db.prepare('SELECT * FROM snipes WHERE groupme_message_id = ?');
      return toSnipe(findByMessageIdStmt.get(groupmeMessageId));
    },
    async findMostRecentUnundone() {
      if (isPg) {
        const res = await db.query('SELECT * FROM snipes WHERE undone = false ORDER BY created_at DESC, id DESC LIMIT 1');
        return toSnipe(res.rows[0]);
      }
      const stmt = db.prepare('SELECT * FROM snipes WHERE undone = 0 ORDER BY created_at DESC, id DESC LIMIT 1');
      return toSnipe(stmt.get());
    },
    async undo(id) {
      if (isPg) {
        const res = await db.query('UPDATE snipes SET undone = true, undone_at = now() WHERE id = $1 RETURNING *', [id]);
        if (res.rowCount === 0) {
          const err = new Error('Snipe not found');
          err.code = 'NOT_FOUND';
          throw err;
        }
        return toSnipe(res.rows[0]);
      }
      const undoStmt = db.prepare(
        "UPDATE snipes SET undone = 1, undone_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
      );
      const findByIdStmt = db.prepare('SELECT * FROM snipes WHERE id = ?');
      const result = undoStmt.run(id);
      if (result.changes === 0) {
        const err = new Error('Snipe not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      return toSnipe(findByIdStmt.get(id));
    },
    async killCountsByGame(gameId) {
      if (isPg) {
        const res = await db.query('SELECT sniper_id AS playerid, COUNT(*)::int AS count FROM snipes WHERE game_id = $1 AND undone = false GROUP BY sniper_id', [gameId]);
        // normalize key name to playerId
        return res.rows.map((r) => ({ playerId: r.playerid, count: Number(r.count) }));
      }
      const killCountsStmt = db.prepare(
        'SELECT sniper_id AS playerId, COUNT(*) AS count FROM snipes WHERE game_id = ? AND undone = 0 GROUP BY sniper_id',
      );
      return killCountsStmt.all(gameId);
    },
    async deathCountsByGame(gameId) {
      if (isPg) {
        const res = await db.query('SELECT victim_id AS playerid, COUNT(*)::int AS count FROM snipes WHERE game_id = $1 AND undone = false GROUP BY victim_id', [gameId]);
        return res.rows.map((r) => ({ playerId: r.playerid, count: Number(r.count) }));
      }
      const deathCountsStmt = db.prepare(
        'SELECT victim_id AS playerId, COUNT(*) AS count FROM snipes WHERE game_id = ? AND undone = 0 GROUP BY victim_id',
      );
      return deathCountsStmt.all(gameId);
    },
    async recent(limit) {
      if (isPg) {
        const res = await db.query(`
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
          LIMIT $1
        `, [limit]);
        return res.rows.map((row) => ({ ...toSnipe(row), sniperName: row.sniper_name, victimName: row.victim_name, gameName: row.game_name }));
      }
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
