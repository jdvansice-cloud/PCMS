-- Grooming Booking Migration
-- Run this in Supabase SQL Editor to add the new grooming tables and columns

-- 1. Create PickupStatus enum
CREATE TYPE "PickupStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'EN_ROUTE_PICKUP', 'EN_ROUTE_DELIVERY', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

-- 2. Create grooming_config table
CREATE TABLE "grooming_config" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "is_online_booking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_advance_days" INTEGER NOT NULL DEFAULT 7,
    "pickup_cutoff_time" TEXT NOT NULL DEFAULT '06:00',
    "receiving_cutoff_time" TEXT NOT NULL DEFAULT '14:00',
    "free_bath_enabled" BOOLEAN NOT NULL DEFAULT false,
    "free_bath_threshold" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grooming_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "grooming_config_organization_id_key" ON "grooming_config"("organization_id");
ALTER TABLE "grooming_config" ADD CONSTRAINT "grooming_config_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Create grooming_pickups table
CREATE TABLE "grooming_pickups" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "status" "PickupStatus" NOT NULL DEFAULT 'REQUESTED',
    "pickup_time" TEXT,
    "pickup_date" TIMESTAMP(3) NOT NULL,
    "picked_up_at" TIMESTAMP(3),
    "delivery_time" TEXT,
    "delivered_at" TIMESTAMP(3),
    "route_order" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grooming_pickups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "grooming_pickups_appointment_id_key" ON "grooming_pickups"("appointment_id");
CREATE INDEX "grooming_pickups_branch_id_pickup_date_idx" ON "grooming_pickups"("branch_id", "pickup_date");
ALTER TABLE "grooming_pickups" ADD CONSTRAINT "grooming_pickups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_pickups" ADD CONSTRAINT "grooming_pickups_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "grooming_pickups" ADD CONSTRAINT "grooming_pickups_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Create grooming_bath_tallies table
CREATE TABLE "grooming_bath_tallies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "total_baths" INTEGER NOT NULL DEFAULT 0,
    "redeemed_baths" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grooming_bath_tallies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "grooming_bath_tallies_organization_id_owner_id_key" ON "grooming_bath_tallies"("organization_id", "owner_id");
ALTER TABLE "grooming_bath_tallies" ADD CONSTRAINT "grooming_bath_tallies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grooming_bath_tallies" ADD CONSTRAINT "grooming_bath_tallies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Modify grooming_sessions: add new columns, make groomer_id nullable, make appointment_id unique
ALTER TABLE "grooming_sessions" ADD COLUMN "kennel_id" TEXT;
ALTER TABLE "grooming_sessions" ADD COLUMN "kennel_assigned_at" TIMESTAMP(3);
ALTER TABLE "grooming_sessions" ADD COLUMN "kennel_released_at" TIMESTAMP(3);
ALTER TABLE "grooming_sessions" ADD COLUMN "pet_size" "KennelSize";
ALTER TABLE "grooming_sessions" ALTER COLUMN "groomer_id" DROP NOT NULL;
CREATE UNIQUE INDEX "grooming_sessions_appointment_id_key" ON "grooming_sessions"("appointment_id");
ALTER TABLE "grooming_sessions" ADD CONSTRAINT "grooming_sessions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grooming_sessions" ADD CONSTRAINT "grooming_sessions_kennel_id_fkey" FOREIGN KEY ("kennel_id") REFERENCES "kennels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Modify services: add bath flags
ALTER TABLE "services" ADD COLUMN "is_bath_service" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN "is_bath_only" BOOLEAN NOT NULL DEFAULT false;

-- 7. Modify sales: add appointment link and online sale flag
ALTER TABLE "sales" ADD COLUMN "appointment_id" TEXT;
ALTER TABLE "sales" ADD COLUMN "is_online_sale" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "sales_appointment_id_key" ON "sales"("appointment_id");
ALTER TABLE "sales" ADD CONSTRAINT "sales_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
