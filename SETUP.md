# PCMS - Setup Guide

Complete setup instructions for Supabase (database, auth, storage) and Vercel (deployment).

---

## Prerequisites

- GitHub account with access to the `jdvansice-cloud/PCMS` repo
- Node.js 18+ installed locally (only needed for `prisma db push`)

---

## 1. Supabase Setup

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `pcms`
   - **Database Password**: generate a strong password and **save it** — you'll need it
   - **Region**: `East US (North Virginia)` — closest to Panama
4. Click **"Create new project"** and wait for it to provision

### 1.2 Connect Supabase to Vercel (auto-imports env vars)

1. In **Vercel**, go to your PCMS project → **Settings → Integrations**
2. Add the **Supabase** integration and connect your Supabase project
3. This **automatically imports** all required environment variables:

| Auto-imported Variable | Used By |
|------------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client (browser & server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (browser & server) |
| `POSTGRES_URL` | Prisma runtime queries (pooled, port 6543) |
| `POSTGRES_URL_NON_POOLING` | Prisma migrations/push (direct, port 5432) |

> You do **not** need to add these manually — the integration handles it.

### 1.3 Configure Authentication

1. Go to **Authentication → Providers** in Supabase
2. Ensure **Email** provider is enabled (it is by default)
3. Under **Email → Settings**:
   - Disable "Confirm email" for development (optional — makes testing easier)
   - Or keep it enabled and check your email for the confirmation link

### 1.4 Create Your First Admin User

1. Go to **Authentication → Users**
2. Click **"Add user" → "Create new user"**
3. Enter:
   - **Email**: your admin email
   - **Password**: a strong password
   - Check **"Auto Confirm User"**
4. Click **"Create user"**

### 1.5 Create Storage Buckets

1. Go to **Storage**
2. Create the following buckets (click **"New bucket"** for each):

| Bucket Name | Public | Purpose |
|-------------|--------|---------|
| `pet-photos` | Yes | Pet profile photos |
| `medical-files` | No | Lab results, X-rays, medical documents |
| `grooming-photos` | Yes | Before/after grooming photos |

For **public** buckets, toggle "Public bucket" to ON during creation.

---

## 2. Create Database Tables

You have two options:

### Option A: Run SQL in Supabase SQL Editor

1. Go to **Supabase Dashboard → SQL Editor → New query**
2. Paste the full SQL schema (see `schema.sql` or ask Claude to generate it)
3. Click **Run**
4. Verify in **Table Editor** — you should see: `organizations`, `users`, `owners`, `pets`, `services`, `products`, `appointments`

### Option B: Use Prisma from your local machine (one-time)

```bash
# Clone the repo if you haven't
git clone https://github.com/jdvansice-cloud/PCMS.git
cd PCMS

# Install dependencies
npm install

# Create a .env file with your Supabase credentials
cp .env.example .env
# Edit .env and fill in your values

# Push schema to Supabase (creates all tables)
npx prisma db push

# Verify tables were created
npx prisma studio
```

---

## 3. Vercel Setup

### 3.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..." → "Project"**
3. Select **"Import Git Repository"**
4. Find and select `jdvansice-cloud/PCMS`
5. Vercel will auto-detect **Next.js** as the framework

### 3.2 Environment Variables

If you used the Supabase Vercel integration (step 1.2), all variables are already set. Verify these exist:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `POSTGRES_URL` | Pooled DB connection (runtime) |
| `POSTGRES_URL_NON_POOLING` | Direct DB connection (Prisma migrations) |

> Make sure they are applied to **all environments** (Production, Preview, Development).

### 3.3 Deploy

1. Click **"Deploy"**
2. Vercel will run: `prisma generate && next build` (configured in `package.json`)
3. Once deployed, you'll get a URL like `pcms-xxxx.vercel.app`

### 3.4 Automatic Deployments

From now on:
- Every **push to `main`** triggers a **production** deploy
- Every **pull request** gets a **preview** deploy with a unique URL

---

## 4. Verify Everything Works

1. Visit your Vercel deployment URL
2. You should see the **login page**
3. Log in with the admin user you created in Supabase (step 1.4)
4. You should see the **dashboard** with the sidebar navigation

---

## 5. Environment Variables Reference

For local `prisma db push` only — create a `.env` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database (copy from Vercel → Settings → Environment Variables)
POSTGRES_URL=postgresql://postgres.your-project-id:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
POSTGRES_URL_NON_POOLING=postgresql://postgres.your-project-id:your-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

## Troubleshooting

### Build fails on Vercel
- Check that `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` exist in Vercel env vars
- Ensure passwords don't contain special characters that need URL-encoding

### "relation does not exist" errors
- Tables haven't been created yet — run the SQL in Supabase SQL Editor or `npx prisma db push`
- This only needs to be done once (or whenever the schema changes)

### Auth not working
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check that the user was created with "Auto Confirm" checked in Supabase
