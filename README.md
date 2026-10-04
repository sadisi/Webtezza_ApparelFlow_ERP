# ApparelFlow ERP — Production Batch Verification & Sewing Queue Gate

## Project Overview
**ApparelFlow ERP** is an enterprise-grade garment manufacturing production control system. It represents a garment manufacturing cutting department where cutting batches containing physical components must be counted, validated, and verified before being released to the sewing floor.

The system's primary engineering requirement is a **server-enforced production gate** that prevents any unverified, incomplete, or shortage batch from entering the Sewing Queue.

## Core State Pipeline
```
CUTTING_IN_PROGRESS → PENDING_VERIFICATION → COUNT_QC → VERIFIED → SEWING_QUEUE
                                   ↓
                                REJECTED (Returned to supervisor)
```

## Technology Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript (Strict Mode)
- **UI & Styling**: React, Tailwind CSS, shadcn/ui, Lucide Icons
- **Database**: Supabase PostgreSQL
- **Validation**: Zod (Schema & server validation)
- **Testing**: Vitest (Unit & Integration), Playwright (E2E)
- **Deployment**: Vercel-compatible

## Project Architecture
```
app/                      # Next.js App Router Pages & API Routes
src/
  ├── domain/             # Pure domain logic (Traffic Light, State Machine, Wastage)
  ├── services/           # Application service orchestration
  ├── db/                 # Database access layer & Supabase client
  ├── auth/               # Server session resolver & RBAC guards
  ├── validation/         # Zod schemas
  └── types/              # TypeScript definitions
components/               # UI components
supabase/migrations/      # SQL schema & seed files
tests/                    # Vitest unit/integration & Playwright E2E suites
```

## Setup & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

## Testing Commands
```bash
# Run unit & integration tests (Vitest)
npm run test

# Run Vitest in watch mode
npm run test:watch

# Run TypeScript type check
npm run type-check

# Run ESLint
npm run lint

# Run End-to-End tests (Playwright)
npm run test:e2e
```
