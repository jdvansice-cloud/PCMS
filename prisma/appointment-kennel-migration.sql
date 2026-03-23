-- Add kennel_id to appointments for clinic visit kennel assignments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS kennel_id TEXT REFERENCES kennels(id);
