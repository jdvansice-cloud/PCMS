-- Add firstVisitAt column to owners
ALTER TABLE "owners" ADD COLUMN IF NOT EXISTS "first_visit_at" TIMESTAMPTZ;

-- Backfill: set firstVisitAt to the earliest checked-in appointment per owner
UPDATE "owners" o
SET "first_visit_at" = sub.first_visit
FROM (
  SELECT "owner_id", MIN("checked_in_at") AS first_visit
  FROM "appointments"
  WHERE "checked_in_at" IS NOT NULL
  GROUP BY "owner_id"
) sub
WHERE o."id" = sub."owner_id"
  AND o."first_visit_at" IS NULL;
