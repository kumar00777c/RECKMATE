-- SQL Migration for RECKMATE Multiplayer Games
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor)

CREATE TABLE IF NOT EXISTS public."Games" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    white_player_id UUID REFERENCES public."Profiles"(id) ON DELETE SET NULL,
    black_player_id UUID REFERENCES public."Profiles"(id) ON DELETE SET NULL,
    white_username TEXT NOT NULL,
    black_username TEXT NOT NULL,
    time_control TEXT NOT NULL DEFAULT '10+0',
    winner TEXT, -- 'white', 'black', or 'draw'
    termination TEXT, -- 'checkmate', 'resignation', 'timeout', 'draw_agreement'
    pgn TEXT,
    fen TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public."Games" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon users to view games (for match history and spectators)
CREATE POLICY "Allow public read access to games"
    ON public."Games"
    FOR SELECT
    USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to games"
    ON public."Games"
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
