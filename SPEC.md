# PCMS v2 — Multi-Tenant Veterinary Clinic Management Platform

## Specification & Implementation Document

**Version:** 2.0
**Date:** 2026-03-15
**Status:** Draft — Pending Approval

---

## 1. Product Overview

PCMS is a multi-tenant SaaS platform for veterinary clinics in Panama (and LATAM). Each tenant (clinic) gets a fully isolated environment for managing patients, appointments, point-of-sale, inventory, grooming, medical records, and communications. Revenue comes from tiered monthly/annual subscriptions via Stripe.

### 1.1 Target Market
- Veterinary clinics (1–20 staff)
- Pet grooming salons
- Mixed clinics (vet + grooming + pet shop)
- Multi-branch clinic chains

---

## 2. Business Model

### 2.1 Subscription Tiers

| Feature | Basic | Pro | Enterprise |
|---------|-------|-----|------------|
| Included users | 5 | 5 | 5 |
| Extra user cost | $X/user/mo | $X/user/mo | $X/user/mo |
| Pet records limit | 500 | 5,000 | Unlimited |
| Appointments/month | 500 | Unlimited | Unlimited |
| Branches | 1 | 3 | Unlimited |
| Custom branding | Logo only | Logo + colors | Full (login page, emails, favicon) |
| Email templates | 3 preset | 10 + custom | Unlimited |
| Public booking page | No | Yes | Yes |
| Reports & export | Basic dashboard | Full reports | Full + scheduled reports |
| Medical records | Basic notes | SOAP + vaccines | Full clinical (labs, imaging, surgery) |
| WhatsApp/WATI | No | 500 msg/mo | Unlimited |
| Data import/export | Import only | Import + Export | Import + Export + API |
| Audit logs | 30 days | 1 year | Unlimited |
| Storage (files/images) | 1 GB | 10 GB | 100 GB |

### 2.2 Billing
- **Processor:** Stripe
- **Cycles:** Monthly or Annual (annual = 2 months free)
- **Proration:** Upgrades/extra users prorated for remaining days in billing cycle
- **Trial:** 14-day free trial with full Enterprise features
- **Payment methods:** Credit/debit card via Stripe

---

## 3. Architecture

### 3.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 16 (App Router) | SSR, RSC, API routes, middleware |
| Language | TypeScript (strict) | Type safety |
| UI | Tailwind CSS v4 + shadcn/ui | Utility-first, accessible components |
| Database | Supabase PostgreSQL | Managed Postgres, RLS, realtime |
| ORM | Prisma 7.x + PrismaPg adapter | Type-safe queries, schema management |
| Auth | Supabase Auth | Email/password, OAuth, magic links |
| Storage | Supabase Storage | File uploads (photos, lab results, logos) |
| Billing | Stripe (Subscriptions API) | Recurring billing, proration, webhooks |
| Email | Resend | Transactional email with React templates |
| Messaging | WATI API | WhatsApp + Instagram messaging |
| i18n | next-intl | Multi-language framework (ES + EN) |
| Deployment | Vercel | Edge functions, auto-deploy |

### 3.2 Multi-Tenancy Strategy

**Approach: Shared database, application-level isolation via `organizationId`.**

Every data table includes an `organization_id` column. Every query is scoped by the current user's organization. Supabase Row-Level Security (RLS) provides a second layer of defense at the database level.

```
┌─────────────────────────────────────────────┐
│                  Vercel (Edge)              │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │  Middleware  │→ │  App Router (RSC)    │  │
│  │  Auth Guard  │  │  Tenant Context      │  │
│  │  i18n       │  │  Permission Check    │  │
│  └─────────────┘  └──────────────────────┘  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            Supabase (PostgreSQL)            │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │   RLS    │ │  Tables  │ │  Storage    │ │
│  │  Policies│ │  (shared)│ │  (buckets)  │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
└─────────────────────────────────────────────┘
```

**Data isolation layers:**
1. **Application layer:** Every Prisma query includes `organizationId` filter
2. **Database layer:** Supabase RLS policies enforce `organization_id = current_org()`
3. **Storage layer:** Supabase Storage bucket policies per organization
4. **URL layer:** Slug-based routing (`/app/{slug}/dashboard`)

### 3.3 URL Structure

```
/                           → Marketing/landing page
/login                      → Login (detects org from user)
/register                   → Self-registration (create org + admin user)
/book/{org-slug}            → Public booking page for a clinic

/app/{org-slug}/            → Redirects to dashboard
/app/{org-slug}/dashboard
/app/{org-slug}/clients
/app/{org-slug}/clients/new
/app/{org-slug}/clients/{id}
/app/{org-slug}/pets
/app/{org-slug}/pets/{id}
/app/{org-slug}/appointments
/app/{org-slug}/appointments/new
/app/{org-slug}/medical-records/{petId}
/app/{org-slug}/grooming
/app/{org-slug}/pos
/app/{org-slug}/pos/sales
/app/{org-slug}/pos/sales/{id}
/app/{org-slug}/inventory
/app/{org-slug}/inventory/{id}
/app/{org-slug}/services
/app/{org-slug}/reports
/app/{org-slug}/settings
/app/{org-slug}/settings/company
/app/{org-slug}/settings/branches
/app/{org-slug}/settings/branding
/app/{org-slug}/settings/users
/app/{org-slug}/settings/roles
/app/{org-slug}/settings/email-templates
/app/{org-slug}/settings/availability
/app/{org-slug}/settings/billing

/admin/                     → Super admin dashboard
/admin/tenants
/admin/tenants/{id}
/admin/subscriptions
/admin/revenue
/admin/system
```

### 3.4 Tenant Context

A React context (`TenantProvider`) wraps all `/app/{org-slug}/*` routes, providing:
- `organization` — full org object with settings, branding, tier
- `user` — current user with role and permissions
- `branch` — currently selected branch (if multi-branch)
- `permissions` — resolved permission set for current user
- `can(action, section)` — permission check helper

This context is hydrated server-side in the layout and passed to client components, avoiding repeated DB lookups.

---

## 4. Database Schema

### 4.1 Core Multi-Tenant Models

```prisma
// ─── Platform (Super Admin) ──────────────────
model PlatformAdmin {
  id        String   @id @default(cuid())
  authId    String   @unique @map("auth_id")
  email     String
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  @@map("platform_admins")
}

// ─── Organization (Tenant) ───────────────────
model Organization {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  ruc           String?
  dv            String?  // DV (dígito verificador) for Panama RUC
  phone         String?
  email         String?
  address       String?
  website       String?
  logo          String?  // Supabase Storage URL
  favicon       String?
  timezone      String   @default("America/Panama")
  currency      String   @default("USD")
  locale        String   @default("es")
  isActive      Boolean  @default(true) @map("is_active")
  trialEndsAt   DateTime? @map("trial_ends_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  subscription  Subscription?
  branding      OrganizationBranding?
  branches      Branch[]
  users         User[]
  roles         Role[]
  // ...all other tenant-scoped models

  @@map("organizations")
}

model OrganizationBranding {
  id              String  @id @default(cuid())
  organizationId  String  @unique @map("organization_id")
  primaryColor    String  @default("#14b8a6")
  secondaryColor  String  @default("#fb923c")
  accentColor     String?
  sidebarColor    String?
  fontFamily      String  @default("Geist")
  darkMode        Boolean @default(false) @map("dark_mode")
  customCss       String?  @map("custom_css")

  organization Organization @relation(fields: [organizationId], references: [id])
  @@map("organization_brandings")
}

model Branch {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  name            String
  phone           String?
  email           String?
  address         String?
  isMain          Boolean  @default(false) @map("is_main")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  businessHours  BusinessHours[]
  // ...relations to appointments, inventory, etc.
  @@map("branches")
}

// ─── Subscription / Billing ──────────────────
model Subscription {
  id                String   @id @default(cuid())
  organizationId    String   @unique @map("organization_id")
  stripeCustomerId  String?  @unique @map("stripe_customer_id")
  stripeSubId       String?  @unique @map("stripe_sub_id")
  plan              Plan     @default(TRIAL)
  billingCycle      BillingCycle @default(MONTHLY)
  status            SubStatus @default(TRIALING)
  currentPeriodEnd  DateTime? @map("current_period_end")
  extraUsers        Int      @default(0) @map("extra_users")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  @@map("subscriptions")
}

enum Plan { TRIAL BASIC PRO ENTERPRISE }
enum BillingCycle { MONTHLY ANNUAL }
enum SubStatus { TRIALING ACTIVE PAST_DUE CANCELLED PAUSED }
```

### 4.2 Users, Roles & Permissions

```prisma
model User {
  id              String   @id @default(cuid())
  authId          String   @unique @map("auth_id")
  organizationId  String   @map("organization_id")
  branchId        String?  @map("branch_id")
  email           String
  firstName       String   @map("first_name")
  lastName        String   @map("last_name")
  phone           String?
  avatar          String?
  userType        UserType @default(STAFF) @map("user_type")
  roleId          String?  @map("role_id")
  isActive        Boolean  @default(true) @map("is_active")
  lastLoginAt     DateTime? @map("last_login_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  branch       Branch?      @relation(fields: [branchId], references: [id])
  role         Role?        @relation(fields: [roleId], references: [id])
  @@map("users")
}

enum UserType { OWNER ADMIN STAFF }
// OWNER = tenant owner (one per org, cannot be combined)
// ADMIN = full admin access (cannot be combined with STAFF roles)
// STAFF = assignable role (vet, receptionist, groomer, cashier — can combine)

model Role {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  name            String
  description     String?
  isSystem        Boolean  @default(false) @map("is_system")  // default roles can't be deleted
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  permissions  RolePermission[]
  users        User[]
  @@map("roles")
}

model RolePermission {
  id        String  @id @default(cuid())
  roleId    String  @map("role_id")
  section   Section
  canView   Boolean @default(false) @map("can_view")
  canCreate Boolean @default(false) @map("can_create")
  canEdit   Boolean @default(false) @map("can_edit")
  canDelete Boolean @default(false) @map("can_delete")

  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@unique([roleId, section])
  @@map("role_permissions")
}

enum Section {
  DASHBOARD
  CLIENTS
  PETS
  APPOINTMENTS
  MEDICAL_RECORDS
  GROOMING
  POS
  INVENTORY
  SERVICES
  REPORTS
  SETTINGS
  USERS
  AUDIT_LOG
}
```

### 4.3 Scheduling & Availability

```prisma
model BusinessHours {
  id        String   @id @default(cuid())
  branchId  String   @map("branch_id")
  dayOfWeek Int      @map("day_of_week")  // 0=Sunday, 6=Saturday
  openTime  String   @map("open_time")    // "08:00"
  closeTime String   @map("close_time")   // "18:00"
  isClosed  Boolean  @default(false) @map("is_closed")

  branch Branch @relation(fields: [branchId], references: [id])
  @@unique([branchId, dayOfWeek])
  @@map("business_hours")
}

model StaffSchedule {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  branchId  String   @map("branch_id")
  dayOfWeek Int      @map("day_of_week")
  startTime String   @map("start_time")  // "09:00"
  endTime   String   @map("end_time")    // "17:00"
  isOff     Boolean  @default(false) @map("is_off")

  user   User   @relation(fields: [userId], references: [id])
  branch Branch @relation(fields: [branchId], references: [id])
  @@unique([userId, branchId, dayOfWeek])
  @@map("staff_schedules")
}

model StaffTimeOff {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  startDate DateTime @map("start_date")
  endDate   DateTime @map("end_date")
  reason    String?
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])
  @@map("staff_time_off")
}
```

### 4.4 Clinical Models

```prisma
model Owner {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  firstName       String   @map("first_name")
  lastName        String   @map("last_name")
  cedula          String?
  ruc             String?
  email           String?
  phone           String?
  whatsapp        String?
  address         String?
  notes           String?
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(...)
  pets         Pet[]
  appointments Appointment[]
  sales        Sale[]
  @@map("owners")
}

model Pet {
  id              String    @id @default(cuid())
  organizationId  String    @map("organization_id")
  ownerId         String    @map("owner_id")
  name            String
  species         Species   @default(DOG)
  breed           String?
  sex             Sex       @default(UNKNOWN)
  dateOfBirth     DateTime? @map("date_of_birth")
  weight          Decimal?  @db.Decimal(5,2)
  color           String?
  microchipId     String?   @map("microchip_id")
  photoUrl        String?   @map("photo_url")
  allergies       String?
  notes           String?
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  organization Organization @relation(...)
  owner        Owner        @relation(...)
  appointments Appointment[]
  medicalRecords MedicalRecord[]
  vaccinations Vaccination[]
  groomingSessions GroomingSession[]
  @@map("pets")
}

model Appointment {
  id              String            @id @default(cuid())
  organizationId  String            @map("organization_id")
  branchId        String            @map("branch_id")
  ownerId         String            @map("owner_id")
  petId           String            @map("pet_id")
  vetId           String?           @map("vet_id")
  serviceId       String?           @map("service_id")
  type            AppointmentType   @default(CONSULTATION)
  status          AppointmentStatus @default(SCHEDULED)
  scheduledAt     DateTime          @map("scheduled_at")
  durationMin     Int               @default(30) @map("duration_min")
  reason          String?
  notes           String?
  isPublicBooking Boolean           @default(false) @map("is_public_booking")
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  // ... relations
  medicalRecord MedicalRecord?
  @@map("appointments")
}

// ─── Medical Records ─────────────────────────
model MedicalRecord {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  petId           String   @map("pet_id")
  appointmentId   String?  @unique @map("appointment_id")
  vetId           String   @map("vet_id")

  // SOAP format
  subjective      String?  // Owner's report
  objective       String?  // Vet findings (exam, vitals)
  assessment      String?  // Diagnosis
  plan            String?  // Treatment plan

  // Vitals
  weightKg        Decimal? @db.Decimal(5,2) @map("weight_kg")
  tempCelsius     Decimal? @db.Decimal(4,1) @map("temp_celsius")
  heartRate       Int?     @map("heart_rate")
  respRate        Int?     @map("resp_rate")
  bodyScore       Int?     @map("body_score")  // 1-9 body condition score

  diagnosis       String?
  notes           String?
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  pet          Pet          @relation(...)
  appointment  Appointment? @relation(...)
  vet          User         @relation(...)
  prescriptions Prescription[]
  labResults   LabResult[]
  surgicalNotes SurgicalNote[]
  attachments  RecordAttachment[]
  @@map("medical_records")
}

model Prescription {
  id              String   @id @default(cuid())
  medicalRecordId String   @map("medical_record_id")
  medicationId    String?  @map("medication_id")
  medicationName  String   @map("medication_name")
  dosage          String
  frequency       String   // e.g., "BID" (twice daily)
  duration        String   // e.g., "7 days"
  route           String?  // oral, topical, injectable
  instructions    String?
  quantity        Int?
  createdAt       DateTime @default(now()) @map("created_at")

  medicalRecord MedicalRecord @relation(...)
  medication    Medication?   @relation(...)
  @@map("prescriptions")
}

model Medication {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  name            String
  genericName     String?  @map("generic_name")
  category        String?  // antibiotic, NSAID, antiparasitic, etc.
  species         String[] // ["DOG", "CAT", "ALL"]
  defaultDosage   String?  @map("default_dosage")
  defaultRoute    String?  @map("default_route")
  contraindications String?
  notes           String?
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(...)
  prescriptions Prescription[]
  @@map("medications")
}

model Vaccination {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  petId           String   @map("pet_id")
  vetId           String   @map("vet_id")
  vaccineName     String   @map("vaccine_name")
  manufacturer    String?
  batchNumber     String?  @map("batch_number")
  administeredAt  DateTime @map("administered_at")
  nextDueDate     DateTime? @map("next_due_date")
  notes           String?
  createdAt       DateTime @default(now()) @map("created_at")

  pet  Pet  @relation(...)
  vet  User @relation(...)
  @@map("vaccinations")
}

model LabResult {
  id              String   @id @default(cuid())
  medicalRecordId String   @map("medical_record_id")
  testName        String   @map("test_name")
  result          String?
  normalRange     String?  @map("normal_range")
  unit            String?
  isAbnormal      Boolean  @default(false) @map("is_abnormal")
  fileUrl         String?  @map("file_url")
  notes           String?
  createdAt       DateTime @default(now()) @map("created_at")

  medicalRecord MedicalRecord @relation(...)
  @@map("lab_results")
}

model SurgicalNote {
  id              String   @id @default(cuid())
  medicalRecordId String   @map("medical_record_id")
  procedure       String
  anesthesiaType  String?  @map("anesthesia_type")
  anesthesiaStart DateTime? @map("anesthesia_start")
  anesthesiaEnd   DateTime? @map("anesthesia_end")
  complications   String?
  notes           String?
  createdAt       DateTime @default(now()) @map("created_at")

  medicalRecord MedicalRecord @relation(...)
  @@map("surgical_notes")
}

model RecordAttachment {
  id              String   @id @default(cuid())
  medicalRecordId String   @map("medical_record_id")
  fileName        String   @map("file_name")
  fileUrl         String   @map("file_url")
  fileType        String   @map("file_type")  // image, pdf, dicom
  description     String?
  createdAt       DateTime @default(now()) @map("created_at")

  medicalRecord MedicalRecord @relation(...)
  @@map("record_attachments")
}
```

### 4.5 Grooming

```prisma
model GroomingSession {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  branchId        String   @map("branch_id")
  petId           String   @map("pet_id")
  groomerId       String   @map("groomer_id")
  appointmentId   String?  @map("appointment_id")
  status          GroomingStatus @default(PENDING)
  scheduledAt     DateTime @map("scheduled_at")
  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  services        String[] // selected grooming services
  skinCondition   String?  @map("skin_condition")
  matting         String?  // none, mild, moderate, severe
  specialInstructions String? @map("special_instructions")
  notes           String?
  beforePhotoUrl  String?  @map("before_photo_url")
  afterPhotoUrl   String?  @map("after_photo_url")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  pet     Pet  @relation(...)
  groomer User @relation(...)
  @@map("grooming_sessions")
}

enum GroomingStatus { PENDING IN_PROGRESS COMPLETED CANCELLED }
```

### 4.6 POS, Inventory & Billing

```prisma
model Product {
  // ... (similar to current, add branchId, expirationDate, batchNumber, supplierId)
  branchId        String?  @map("branch_id")
  expirationDate  DateTime? @map("expiration_date")
  batchNumber     String?  @map("batch_number")
  supplierId      String?  @map("supplier_id")
  // ...
}

model Supplier {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  name            String
  contactName     String?  @map("contact_name")
  email           String?
  phone           String?
  address         String?
  notes           String?
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(...)
  purchaseOrders PurchaseOrder[]
  products       Product[]
  @@map("suppliers")
}

model PurchaseOrder {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  supplierId      String   @map("supplier_id")
  branchId        String   @map("branch_id")
  orderNumber     Int      @map("order_number")
  status          POStatus @default(DRAFT)
  totalAmount     Decimal  @db.Decimal(10,2) @map("total_amount")
  notes           String?
  orderedAt       DateTime? @map("ordered_at")
  receivedAt      DateTime? @map("received_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  supplier     Supplier @relation(...)
  lines        PurchaseOrderLine[]
  @@map("purchase_orders")
}

enum POStatus { DRAFT ORDERED PARTIALLY_RECEIVED RECEIVED CANCELLED }

model Sale {
  // ... (enhanced from current)
  branchId        String   @map("branch_id")
  discountAmount  Decimal? @db.Decimal(10,2) @map("discount_amount")
  discountType    DiscountType? @map("discount_type")
  balanceDue      Decimal  @default(0) @db.Decimal(10,2) @map("balance_due")
  // ...
  payments        SalePayment[]  // multiple payment methods per sale
}

model SalePayment {
  id            String        @id @default(cuid())
  saleId        String        @map("sale_id")
  paymentMethod PaymentMethod @map("payment_method")
  amount        Decimal       @db.Decimal(10,2)
  reference     String?       // transaction ID, check number, etc.
  paidAt        DateTime      @default(now()) @map("paid_at")

  sale Sale @relation(...)
  @@map("sale_payments")
}

model Refund {
  id            String   @id @default(cuid())
  saleId        String   @map("sale_id")
  amount        Decimal  @db.Decimal(10,2)
  reason        String?
  processedById String   @map("processed_by_id")
  createdAt     DateTime @default(now()) @map("created_at")

  sale        Sale @relation(...)
  processedBy User @relation(...)
  @@map("refunds")
}

enum DiscountType { PERCENTAGE FIXED }
```

### 4.7 Hospitalization / Kennel Management

```prisma
model Kennel {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  branchId        String   @map("branch_id")
  name            String   // "Kennel A1", "Cat Ward 2"
  size            KennelSize @default(MEDIUM)
  species         Species?  // optional: restrict to species
  isAvailable     Boolean  @default(true) @map("is_available")
  notes           String?

  organization Organization @relation(...)
  branch       Branch       @relation(...)
  stays        KennelStay[]
  @@map("kennels")
}

enum KennelSize { SMALL MEDIUM LARGE XL }

model KennelStay {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  kennelId        String   @map("kennel_id")
  petId           String   @map("pet_id")
  vetId           String?  @map("vet_id")
  reason          String   // post-surgery, observation, boarding
  admittedAt      DateTime @map("admitted_at")
  dischargedAt    DateTime? @map("discharged_at")
  status          StayStatus @default(ACTIVE)
  feedingSchedule String?  @map("feeding_schedule")
  specialCare     String?  @map("special_care")
  notes           String?
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  kennel        Kennel @relation(...)
  pet           Pet    @relation(...)
  dailyLogs     KennelDailyLog[]
  @@map("kennel_stays")
}

model KennelDailyLog {
  id          String   @id @default(cuid())
  stayId      String   @map("stay_id")
  loggedById  String   @map("logged_by_id")
  date        DateTime
  feeding     String?
  medication  String?
  temperature Decimal? @db.Decimal(4,1)
  weight      Decimal? @db.Decimal(5,2)
  behavior    String?
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")

  stay     KennelStay @relation(...)
  loggedBy User       @relation(...)
  @@map("kennel_daily_logs")
}

enum StayStatus { ACTIVE DISCHARGED TRANSFERRED DECEASED }
```

### 4.8 Email Templates

```prisma
model EmailTemplate {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  name            String
  slug            String   // appointment-reminder, vaccine-due, receipt, etc.
  subject         String
  bodyHtml        String   @map("body_html")  // WYSIWYG output
  bodyJson        String?  @map("body_json")  // editor state for re-editing
  variables       String[] // ["client_name", "pet_name", "date", ...]
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  organization Organization @relation(...)
  @@unique([organizationId, slug])
  @@map("email_templates")
}

model EmailLog {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  templateId      String?  @map("template_id")
  recipientEmail  String   @map("recipient_email")
  subject         String
  status          EmailStatus @default(QUEUED)
  sentAt          DateTime?  @map("sent_at")
  resendId        String?    @map("resend_id")
  error           String?
  createdAt       DateTime @default(now()) @map("created_at")

  organization Organization @relation(...)
  @@map("email_logs")
}

enum EmailStatus { QUEUED SENT DELIVERED BOUNCED FAILED }
```

### 4.9 Audit Log

```prisma
model AuditLog {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")
  userId          String?  @map("user_id")
  action          AuditAction
  entityType      String   @map("entity_type")  // "Owner", "Pet", "Sale", etc.
  entityId        String   @map("entity_id")
  changes         Json?    // { field: { old: "x", new: "y" } }
  metadata        Json?    // additional context (IP, user agent)
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([organizationId, entityType, entityId])
  @@index([organizationId, createdAt])
  @@map("audit_logs")
}

enum AuditAction { CREATE UPDATE DELETE SOFT_DELETE RESTORE LOGIN LOGOUT }
```

---

## 5. Permission System

### 5.1 Default Roles (auto-created per org)

| Role | Sections with Full Access | Notes |
|------|--------------------------|-------|
| Owner | ALL | Cannot be deleted, one per org |
| Admin | ALL except Audit Log (view only) | Cannot be combined with staff |
| Veterinarian | Dashboard (V), Clients (VCUD), Pets (VCUD), Appointments (VCUD), Medical Records (VCUD), POS (VC), Inventory (V), Services (V) | |
| Receptionist | Dashboard (V), Clients (VCUD), Pets (VC), Appointments (VCUD), POS (VCUD), Grooming (VCU) | |
| Groomer | Dashboard (V), Clients (V), Pets (V), Grooming (VCUD) | |
| Cashier | Dashboard (V), Clients (V), Pets (V), POS (VCUD), Inventory (V) | |

V=View, C=Create, U=Update (Edit), D=Delete

### 5.2 Custom Roles
Admins/Owners can create custom roles with any combination of permissions. Staff users can be assigned ONE custom role, OR one of the system defaults.

### 5.3 Permission Check Flow
```
Request → Middleware (auth) → Layout (load user+role+permissions)
→ Server Component/Action checks: can(user, 'EDIT', 'CLIENTS')
→ If denied: show 403 or hide UI element
```

---

## 6. Email System

### 6.1 Template Types (pre-built)
1. **Appointment reminder** — sent 24h before
2. **Appointment confirmation** — sent on booking
3. **Vaccination due** — sent when next vaccine date approaches
4. **Receipt/Invoice** — sent after POS sale
5. **Welcome email** — sent to new clients
6. **Post-visit follow-up** — sent 48h after appointment
7. **Password reset** — system email
8. **User invitation** — sent when admin creates a user

### 6.2 Variable Placeholders
```
{{client_name}}, {{client_first_name}}, {{pet_name}}, {{pet_species}},
{{appointment_date}}, {{appointment_time}}, {{vet_name}}, {{service_name}},
{{clinic_name}}, {{clinic_phone}}, {{clinic_address}}, {{clinic_logo}},
{{sale_total}}, {{sale_number}}, {{vaccine_name}}, {{next_due_date}},
{{booking_url}}, {{unsubscribe_url}}
```

### 6.3 WYSIWYG Editor
Use **TipTap** (headless, React-native, MIT license) for the template editor with:
- Rich text formatting (bold, italic, headers, lists)
- Image insertion (from Supabase Storage)
- Variable insertion button (dropdown of available vars)
- Preview mode with sample data
- Responsive email rendering

---

## 7. WATI Integration (WhatsApp)

### 7.1 Features
- Send appointment reminders
- Send vaccination due notices
- Send receipt summaries
- Template-based messaging (pre-approved WhatsApp templates)
- Receive replies (webhook → log in system)

### 7.2 Implementation
- WATI API integration via server actions
- Message templates managed in settings
- Message log per client
- Rate limiting per tier

---

## 8. Public Booking Page

### 8.1 URL: `/book/{org-slug}`
- Shows clinic info (name, logo, address, phone)
- Service selector (only bookable services)
- Date picker (shows available days based on business hours)
- Time slot picker (shows open slots based on vet availability)
- Client info form (name, phone, email, pet name, pet species)
- Booking confirmation email/WhatsApp

### 8.2 Rules
- No authentication required
- Creates Owner + Pet if not existing (matched by phone/email)
- Respects business hours + staff schedules
- Shows service duration for slot calculation
- Anti-spam: rate limiting + optional CAPTCHA

---

## 9. Responsive Design Strategy

### 9.1 Breakpoints
- **Mobile:** < 640px — Single column, bottom nav, collapsible sidebar
- **Tablet:** 640–1024px — Sidebar as overlay/drawer, 2-column grids
- **Desktop:** > 1024px — Full sidebar, multi-column layouts

### 9.2 Key Mobile Adaptations
- **Sidebar:** Collapses to hamburger menu + bottom navigation bar
- **Tables:** Horizontal scroll on mobile, or card-based list view
- **POS:** Full-screen cart modal on mobile, side panel on desktop
- **Forms:** Stack fields vertically, full-width inputs
- **Dashboard:** Single-column stat cards, swipeable sections

---

## 10. i18n Strategy

### 10.1 Framework: next-intl
- Messages stored as JSON files: `messages/es.json`, `messages/en.json`
- Per-tenant locale preference stored in `Organization.locale`
- URL-based locale: `/es/app/...` or `/en/app/...`
- Client components use `useTranslations()` hook
- Server components use `getTranslations()` async function

### 10.2 Launch Languages
- **Spanish (es):** Primary, 100% coverage
- **English (en):** Secondary, 100% coverage

---

## 11. Audit & History System

### 11.1 Implementation
- **Prisma middleware** intercepts all `create`, `update`, `delete` operations
- Captures: old values → new values as JSON diff
- Stores in `audit_logs` table with user, timestamp, entity reference
- Immutable: audit logs can never be modified or deleted
- Retention configurable per tier (30 days / 1 year / unlimited)

### 11.2 Audit Log UI
- Filterable by: entity type, user, date range, action type
- Shows human-readable diffs (field: old → new)
- Access controlled by role permissions

---

## 12. Reports & Analytics

### 12.1 Report Types
1. **Revenue:** Daily/weekly/monthly income, by payment method, by service/product
2. **Appointments:** Per vet, per type, cancellation rate, no-show rate
3. **Clients:** New vs returning, retention rate, top clients by revenue
4. **Inventory:** Stock levels, turnover rate, expiring items, top products
5. **Vaccination:** Compliance rate, upcoming vaccines, overdue list
6. **Staff:** Appointments per staff, revenue per vet, productivity
7. **Grooming:** Sessions per groomer, popular services, revenue

### 12.2 Export
- **Excel (.xlsx):** Full data tables
- **CSV:** Raw data for analysis
- **PDF:** Formatted reports with charts for printing

---

## 13. Implementation Phases

### Phase 1 — MVP (Core Clinical + POS) ← BUILD FIRST
1. Multi-tenant architecture (org, slug routing, tenant context)
2. Auth overhaul (registration, org creation, user invitation)
3. Role & permission system (RBAC with section-level CRUD)
4. Settings module (company info, branding, business hours)
5. Branch management
6. User management (invite, edit, deactivate)
7. Clients (Owners) CRUD — redesigned for multi-tenant
8. Pets CRUD — redesigned for multi-tenant
9. Appointments with availability engine
10. POS with full features (discounts, split payment, refunds)
11. Inventory with suppliers + purchase orders
12. Services CRUD
13. WATI WhatsApp integration
14. i18n framework (ES + EN)
15. Responsive design (mobile-first)
16. Audit log system
17. Stripe subscription billing
18. Super admin panel (basic)

### Phase 2 — Clinical
1. Medical records (SOAP notes, vitals)
2. Prescriptions + medication database
3. Vaccination tracking + suggested schedules
4. Lab results upload
5. Surgical notes + anesthesia log
6. File attachments (images, PDFs, DICOM)
7. Public booking page

### Phase 3 — Grooming & Hospitalization
1. Full grooming module (separate queue, photos, notes)
2. Kennel management (grid, occupancy)
3. Hospitalization (admission, daily logs, discharge)

### Phase 4 — Advanced
1. DGI e-invoicing (Panama fiscal)
2. Comprehensive reports + charts
3. Excel/CSV/PDF export
4. Data import wizards
5. Full data export (backup)
6. Email template WYSIWYG editor
7. Scheduled email campaigns
8. Enhanced super admin (revenue analytics, usage monitoring)

### Phase 5 — Polish
1. Custom domains per tenant
2. Advanced branding (custom login page, favicon)
3. Recurring appointments
4. PWA upgrade (if needed)
5. API access for Enterprise tier
6. Performance optimization (caching, edge functions)

---

## 14. Performance Best Practices

1. **Server Components by default** — minimize client JS bundle
2. **Parallel data fetching** — `Promise.all()` for independent queries
3. **Prisma query optimization** — select only needed fields, avoid N+1
4. **ISR/caching** — cache static content (medication database, service list)
5. **Edge middleware** — auth/redirect at edge, not origin
6. **Image optimization** — Next.js Image component + Supabase CDN
7. **Code splitting** — dynamic imports for heavy components (WYSIWYG editor, charts)
8. **Database indexes** — on organizationId + frequently queried fields
9. **Connection pooling** — Supavisor IPv4 pooler (already configured)
10. **Vercel region** — match to Supabase region (us-east-1)

---

## 15. Security

1. **RLS policies** on all tables (defense in depth)
2. **CSRF protection** via Next.js server actions
3. **Input validation** with Zod on every mutation
4. **SQL injection prevention** via Prisma parameterized queries
5. **XSS prevention** via React auto-escaping + Content Security Policy
6. **Rate limiting** on auth endpoints + public booking
7. **Audit logging** for compliance and forensics
8. **Encrypted storage** for sensitive fields (Supabase vault)
9. **HTTPS only** (Vercel enforced)
10. **Tenant isolation** verified at application + database layers
