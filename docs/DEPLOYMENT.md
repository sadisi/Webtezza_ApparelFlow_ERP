# ApparelFlow ERP Deployment Guide

## Production Deployment Status

`Production deployment: PENDING`

> [!NOTE]
> The application has passed all local production build checks (`npm run build`), static type verification (`npm run type-check`), linting (`npm run lint`), and 232 automated tests (`npm test`). The instructions below outline the deployment procedure for production hosting.

---

## Deployment Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   Vercel / Next.js                     │
│         Next.js 16 App Router Production App           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (HTTPS API Requests)
┌────────────────────────────────────────────────────────┐
│                     Supabase Cloud                     │
│         PostgreSQL Database + Auth Service             │
└────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **Node.js**: v20.x or higher
2. **Supabase Cloud Project**: Managed Supabase database instance with PostgreSQL v15+
3. **Vercel / Hosting Provider**: Account configured with Next.js 16 build support

---

## 1. Database Provisioning & Migrations

Execute the SQL migrations in order against the target Supabase PostgreSQL instance:

```bash
# Apply schema migration (Tables, Types, Indexes, Triggers, RLS)
supabase db push --file supabase/migrations/001_schema.sql

# Seed recipe master data
supabase db push --file supabase/migrations/002_seed.sql
```

Alternatively, copy the contents of `supabase/migrations/001_schema.sql` and `002_seed.sql` directly into the Supabase SQL Editor.

---

## 2. Environment Variables Configuration

Configure the following environment variables in the production hosting dashboard (e.g., Vercel Project Settings → Environment Variables):

| Variable Name | Required | Scope | Description |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser & Server | Supabase project HTTPS URL (`https://<project-id>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser & Server | Supabase public publishable/anon API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-Only | Supabase secret service-role API key (bypasses RLS) |

> [!CAUTION]
> NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or prefix it with `NEXT_PUBLIC_`. It must remain strictly server-side.

---

## 3. Seed Production Demo Users

Once database migrations are complete and environment variables are set, seed the 3 demo user accounts:

```bash
# Run user seeder script using tsx
npx tsx supabase/seed-auth-users.ts
```

This creates the auth users in Supabase Auth and upserts matching profiles in `public.users`.

---

## 4. Application Build & Launch

Execute the build command locally to verify zero build errors before pushing to deployment:

```bash
# Install dependencies
npm install

# Verify static typing
npm run type-check

# Run linter
npm run lint

# Run test suite
npm test

# Build production application
npm run build

# Start production server locally (port 3000)
npm start
```

---

## 5. Deployment Verification Checklist

After deploying to production:

* [ ] Access `/login` and test authentication for all 3 demo accounts.
* [ ] Verify Cutting Supervisor can create an order (`/cutting-orders/new`).
* [ ] Verify Cutting Verifier can perform count QC in the Verification Terminal (`/verification`).
* [ ] Test RED shortage block — confirm system prevents approval if item count is under target.
* [ ] Verify Sewing Supervisor sees approved orders in the Sewing Queue (`/sewing-queue`).
* [ ] Confirm unauthorized role access yields HTTP 403 Forbidden.
