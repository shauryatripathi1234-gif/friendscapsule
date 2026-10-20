-- =========================================================
-- THE TRIPATHI FRIENDSHIP CAPSULE • SUPABASE DATABASE SCHEMA
-- Run this in your Supabase Dashboard -> "SQL Editor" -> "New query" -> "Run"
-- =========================================================

-- 1. Create memories table
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  friend_name TEXT NOT NULL,
  note TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  photo_url TEXT NOT NULL,
  mood TEXT DEFAULT 'Bakchodi',
  filter TEXT DEFAULT 'none',
  stickers JSONB DEFAULT '[]'::JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Create vault_config table (for dynamic zero-hint password across all devices)
CREATE TABLE IF NOT EXISTS vault_config (
  id TEXT PRIMARY KEY DEFAULT 'primary_config',
  vault_password TEXT DEFAULT '2026',
  previous_password TEXT,
  title TEXT DEFAULT 'The Friendship Capsule',
  subtitle TEXT DEFAULT 'A private vault of timeless memories for our inner circle',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Seed initial vault config with your master password (2026)
INSERT INTO vault_config (id, vault_password, title, subtitle)
VALUES (
  'primary_config',
  '2026',
  'The Friendship Capsule',
  'A private vault of timeless memories for our inner circle'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS) with full open policies for the app API
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_config ENABLE ROW LEVEL SECURITY;

-- Memories policies
DROP POLICY IF EXISTS "Public select memories" ON memories;
DROP POLICY IF EXISTS "Public insert memories" ON memories;
DROP POLICY IF EXISTS "Public update memories" ON memories;
DROP POLICY IF EXISTS "Public delete memories" ON memories;

CREATE POLICY "Public select memories" ON memories FOR SELECT USING (true);
CREATE POLICY "Public insert memories" ON memories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update memories" ON memories FOR UPDATE USING (true);
CREATE POLICY "Public delete memories" ON memories FOR DELETE USING (true);

-- Vault config policies
DROP POLICY IF EXISTS "Public select config" ON vault_config;
DROP POLICY IF EXISTS "Public insert config" ON vault_config;
DROP POLICY IF EXISTS "Public update config" ON vault_config;

CREATE POLICY "Public select config" ON vault_config FOR SELECT USING (true);
CREATE POLICY "Public insert config" ON vault_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update config" ON vault_config FOR UPDATE USING (true);

-- Success check
SELECT 'Friendship Capsule Supabase Schema is ready!' AS status;
