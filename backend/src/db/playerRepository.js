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
  const upsertStmt = db.prepare(`
    INSERT INTO players (groupme_user_id, display_name)
    VALUES (?, ?)
    ON CONFLICT(groupme_user_id) DO UPDATE SET
      display_name = excluded.display_name,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `);
  const findByGroupmeIdStmt = db.prepare('SELECT * FROM players WHERE groupme_user_id = ?');
  const findByIdStmt = db.prepare('SELECT * FROM players WHERE id = ?');
  const updateDisplayNameStmt = db.prepare(
    "UPDATE players SET display_name = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  );
  const allStmt = db.prepare('SELECT * FROM players');

  return {
    upsert(groupmeUserId, displayName) {
      upsertStmt.run(groupmeUserId, displayName);
      return toPlayer(findByGroupmeIdStmt.get(groupmeUserId));
    },
    findByGroupmeId(groupmeUserId) {
      return toPlayer(findByGroupmeIdStmt.get(groupmeUserId));
    },
    findById(id) {
      return toPlayer(findByIdStmt.get(id));
    },
    updateDisplayName(id, displayName) {
      const result = updateDisplayNameStmt.run(displayName, id);
      if (result.changes === 0) {
        const err = new Error('Player not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
      return toPlayer(findByIdStmt.get(id));
    },
    all() {
      return allStmt.all().map(toPlayer);
    },
  };
}

module.exports = { createPlayerRepository };
