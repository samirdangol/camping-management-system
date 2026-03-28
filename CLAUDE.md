# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Camping Management System ("Nepali Camping") — a group camping planner for the Nepali community in Seattle. Built with Next.js 16 (App Router), Prisma ORM, Neon PostgreSQL, and shadcn/ui components. Deployed on Vercel.

## Commands

- `npm run dev` — start dev server (Next.js with Turbopack)
- `npm run build` — generate Prisma client + build (`prisma generate && next build`)
- `npm run lint` — run ESLint
- `npx prisma db push` — push schema changes to Neon DB
- `npx prisma studio` — open Prisma Studio GUI for the database
- `npm run seed` — seed database via `prisma/seed.ts`
- `npx shadcn@latest add <component>` — add a shadcn/ui component

## Architecture

### Authentication
Single shared passcode (`APP_PASSCODE` env var) protects the app. JWT token (HS256, 30-day expiry) stored in `cms-auth` httpOnly cookie. Middleware (`src/middleware.ts`) checks JWT on all routes except `/login`, `/api/auth`, `/join/*`, and family lookup endpoints. There is no per-user auth — all authenticated users share the same access level.

### Family Identity
After login, users select their family at `/select-family`. Family identity is stored client-side (localStorage). Families have an optional 4-digit PIN for verification. The organizer family (who created the event) has admin privileges for that event.

### Data Model (Prisma)
- **Family** — central identity; linked to signups, meals, activities, groceries, equipment, expenses
- **CampingEvent** — has one organizer Family; linked to all event content via foreign keys
- **EventSignup** — family's RSVP with headcount (adults, kids, elderly, vegetarians)
- **Meal / MealVolunteer / FoodItem** — meal planning with volunteer assignments
- **Activity / ActivityVolunteer** — activities with leader and volunteer tracking
- **GroceryItem / GroceryVolunteer** — grocery list with category, assignment, purchase status, sortOrder
- **Equipment / EquipmentVolunteer** — gear/supplies list with category, owner, sortOrder
- **Expense** — cost tracking with paidBy family
- All event-child models cascade delete when event is deleted

### Server Actions
`src/app/actions.ts` contains all server actions (family signup, meals CRUD, grocery/equipment management, etc.) using Prisma transactions. Actions call `revalidatePath` to refresh pages.

### API Routes
`src/app/api/` mirrors the data model. Event-scoped routes live under `/api/events/[eventId]/`. Used by client components that need fetch-based data loading.

### UI Stack
- **shadcn/ui** (new-york style) with Tailwind CSS v4, Radix UI primitives
- **lucide-react** icons
- **sonner** for toast notifications
- **next-themes** available but currently light-only (`bg-gray-50` on body)
- Components: `src/components/ui/` (shadcn primitives), `src/components/layout/` (header, event tabs), `src/components/shared/` (reusable app components), `src/components/events/` (event-specific)

### Event Navigation
`EventTabs` component (`src/components/layout/event-tabs.tsx`) provides tab navigation within an event: Overview, Sign Up, Meals, Groceries, Equipment, Activities, Expenses. Each tab maps to `/events/[eventId]/<tab>`.

### Bulk Import
`src/components/bulk-import/` has paste-to-import and category-first bulk add components shared between groceries and equipment pages.

### Key Patterns
- Pages under `src/app/events/[eventId]/` are wrapped by a shared layout that fetches the event and renders the header + tabs
- `EventAccessGuard` component checks family signup status before rendering child content
- Prisma client is configured with `omit: { family: { pin: true } }` to exclude PINs from default queries
- Prisma uses `PrismaNeon` adapter with WebSocket polyfill for Node.js environments
- `@vercel/blob` used for image uploads (event images)

### Database
Neon PostgreSQL. Connection via `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) env vars. Local dev can use `prisma/dev.db` but production uses Neon.
