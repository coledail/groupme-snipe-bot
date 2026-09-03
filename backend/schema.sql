PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupme_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS snipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  sniper_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  victim_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  groupme_message_id TEXT NOT NULL,
  image_url TEXT,
  undone INTEGER DEFAULT 0,
  undone_at TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_snipes_game ON snipes(game_id);
CREATE INDEX IF NOT EXISTS idx_snipes_sniper ON snipes(sniper_id);
CREATE INDEX IF NOT EXISTS idx_snipes_victim ON snipes(victim_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_snipes_message_victim ON snipes(groupme_message_id, victim_id);
