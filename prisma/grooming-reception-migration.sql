-- Migration: Grooming & Reception System
-- Adds pet size, appointment walk-in/pickup tracking, grooming session pickup

-- 1. Add size column to pets (uses existing KennelSize enum)
ALTER TABLE pets ADD COLUMN IF NOT EXISTS size TEXT;

-- 2. Add walk-in and pickup columns to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;

-- 3. Add picked_up_at to grooming_sessions
ALTER TABLE grooming_sessions ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_checked_in ON appointments (organization_id, checked_in_at) WHERE checked_in_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grooming_sessions_picked_up ON grooming_sessions (organization_id, picked_up_at) WHERE picked_up_at IS NULL;
