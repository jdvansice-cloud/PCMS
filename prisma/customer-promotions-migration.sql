-- Customer Promotions Migration
-- Run this in Supabase SQL Editor

-- 1. Remove free bath columns from grooming_config
ALTER TABLE "grooming_config" DROP COLUMN IF EXISTS "free_bath_enabled";
ALTER TABLE "grooming_config" DROP COLUMN IF EXISTS "free_bath_threshold";

-- 2. Drop grooming_bath_tallies table
DROP TABLE IF EXISTS "grooming_bath_tallies";

-- 3. Add available_online to promotions
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "available_online" BOOLEAN NOT NULL DEFAULT false;

-- 4. Create CustomerPromotionItemRole enum
DO $$ BEGIN
    CREATE TYPE "CustomerPromotionItemRole" AS ENUM ('QUALIFYING', 'REWARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Create customer_promotions table
CREATE TABLE IF NOT EXISTS "customer_promotions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "threshold" INTEGER NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "available_online" BOOLEAN NOT NULL DEFAULT false,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_promotions_pkey" PRIMARY KEY ("id")
);

-- 6. Create customer_promotion_items table
CREATE TABLE IF NOT EXISTS "customer_promotion_items" (
    "id" TEXT NOT NULL,
    "customer_promotion_id" TEXT NOT NULL,
    "role" "CustomerPromotionItemRole" NOT NULL,
    "product_id" TEXT,
    "service_id" TEXT,

    CONSTRAINT "customer_promotion_items_pkey" PRIMARY KEY ("id")
);

-- 7. Create customer_promotion_progress table
CREATE TABLE IF NOT EXISTS "customer_promotion_progress" (
    "id" TEXT NOT NULL,
    "customer_promotion_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "total_redeemed" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_promotion_progress_pkey" PRIMARY KEY ("id")
);

-- 8. Add indexes and constraints
CREATE INDEX IF NOT EXISTS "customer_promotions_organization_id_is_active_idx" ON "customer_promotions"("organization_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "customer_promotion_progress_customer_promotion_id_owner_id_key" ON "customer_promotion_progress"("customer_promotion_id", "owner_id");

-- 9. Foreign keys for customer_promotions
ALTER TABLE "customer_promotions" ADD CONSTRAINT "customer_promotions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Foreign keys for customer_promotion_items
ALTER TABLE "customer_promotion_items" ADD CONSTRAINT "customer_promotion_items_customer_promotion_id_fkey" FOREIGN KEY ("customer_promotion_id") REFERENCES "customer_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_promotion_items" ADD CONSTRAINT "customer_promotion_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_promotion_items" ADD CONSTRAINT "customer_promotion_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 11. Foreign keys for customer_promotion_progress
ALTER TABLE "customer_promotion_progress" ADD CONSTRAINT "customer_promotion_progress_customer_promotion_id_fkey" FOREIGN KEY ("customer_promotion_id") REFERENCES "customer_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_promotion_progress" ADD CONSTRAINT "customer_promotion_progress_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
