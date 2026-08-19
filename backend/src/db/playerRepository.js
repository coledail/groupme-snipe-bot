function toPlayer(row) {
  if (!row) return null;
  return {
    id: row.id,
    groupmeUserId: row.groupme_user_id,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createPlayerRepository(db) {
  const isPg = db && typeof db.query === 'function';

  return {
    async upsert(groupmeUserId, displayName) {
      if (isPg) {
        const sql = `INSERT INTO players (groupme_user_id, display_name) VALUES ($1, $2)
          ON CONFLICT (groupme_user_id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()
          RETURNING *`;
        const res = await db.query(sql, [groupmeUserId, displayName]);
        return toPlayer(res.rows[0]);
      }
      const upsertStmt = db.prepare(`
        INSERT INTO players (groupme_user_id, display_name)
        VALUES (?, ?)
        ON CONFLICT(groupme_user_id) DO UPDATE SET
          display_name = excluded.display_name,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `);
      const findByGroupmeIdStmt = db.prepare('SELECT * FROM players WHERE groupme_user_id = ?');
      upsertStmt.run(groupmeUserId, displayName);
      return toPlayer(findByGroupmeIdStmt.get(groupmeUserId));
    },
    async findByGroupmeId(groupmeUserId) {
      if (isPg) {
        const res = await db.query('SELECT * FROM players WHERE groupme_user_id = $1 LIMIT 1', [groupmeUserId]);
        return toPlayer(res.rows[0]);
      }
      const findByGroupmeIdStmt = db.prepare('SELECT * FROM players WHERE groupme_user_id = ?');
      return toPlayer(findByGroupmeIdStmt.get(groupmeUserId));
    },
    async findById(id) {
      if (isPg) {
        const res = await db.query('SELECT * FROM players WHERE id = $1 LIMIT 1', [id]);
        return toPlayer(res.rows[0]);
      }
      const findByIdStmt = db.prepare('SELECT * FROM players WHERE id = ?');
      return toPlayer(findByIdStmt.get(id));
    },
    async updateDisplayName(id, displayName) {
      if (isPg) {
        const res = await db.query('UPDATE players SET display_name = $1, updated_at = now() WHERE id = $2 RETURNING *', [displayName, id]);
        if (res.rowCount === 0) {
          const err = new Error('Player not found');
          err.code = 'NOT_FOUND';
          throw err;
        }
        return toPlayer(res.rows[0]);
      }
      const updateDisplayNameStmt = db.prepare(
        "UPDATE players SET display_name = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
      );
      const findByIdStmt = db.prepare('SELECT * FROM players WHERE id = ?');
      const result = updateDisplayNameStmt.run(displayName, id);
      if (result.changes === 0) {
        const err = new Error('Player not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      return toPlayer(findByIdStmt.get(id));
    },
    async all() {
      if (isPg) {
        const res = await db.query('SELECT * FROM players');
        return res.rows.map(toPlayer);
      }
      const allStmt = db.prepare('SELECT * FROM players');
      return allStmt.all().map(toPlayer);
    },
  };
}

module.exports = { createPlayerRepository };
