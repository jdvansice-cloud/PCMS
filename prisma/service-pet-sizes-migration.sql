-- Add pet_sizes column to services table
-- Empty array means "all sizes", otherwise contains specific sizes like ["SMALL","MEDIUM"]
ALTER TABLE services ADD COLUMN IF NOT EXISTS pet_sizes TEXT[] NOT NULL DEFAULT '{}';
