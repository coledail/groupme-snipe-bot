CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  groupme_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snipes (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  sniper_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  victim_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  groupme_message_id TEXT NOT NULL,
  image_url TEXT,
  undone BOOLEAN DEFAULT false,
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE snipes DROP CONSTRAINT IF EXISTS snipes_groupme_message_id_key;

CREATE INDEX IF NOT EXISTS idx_snipes_game ON snipes(game_id);
CREATE INDEX IF NOT EXISTS idx_snipes_sniper ON snipes(sniper_id);
CREATE INDEX IF NOT EXISTS idx_snipes_victim ON snipes(victim_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_snipes_message_victim ON snipes(groupme_message_id, victim_id);