-- Capillary Playground — Neon PostgreSQL Schema
-- Run this once in Neon SQL Editor (console.neon.tech)

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(20) NOT NULL UNIQUE,
  team       VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scores (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(20) NOT NULL,
  team       VARCHAR(30) NOT NULL,
  game       VARCHAR(20) NOT NULL,
  game_name  VARCHAR(40) NOT NULL,
  score      INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at);
CREATE INDEX IF NOT EXISTS idx_scores_name_game ON scores(name, game);

-- Stats counters
CREATE TABLE IF NOT EXISTS stats (
  key   VARCHAR(30) PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO stats (key, value) VALUES ('games_played', 0) ON CONFLICT DO NOTHING;
