# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Camping Management System ("Nepali Camping") — a group camping planner originally built for the Nepali community in Seattle, now multi-tenant. Built with Next.js 16 (App Router, Turbopack), Prisma ORM, Neon PostgreSQL, and shadcn/ui. Deployed on Vercel.

## Commands

- `npm run dev` — start dev server (Next.js with Turbopack)
- `npm run build` — generate Prisma client + build (`prisma generate && next build`)
- `npm run lint` — run ESLint
- `npx prisma db push` — push schema changes to Neon DB
- `npx prisma studio` — open Prisma Studio GUI
- `npm run seed` — seed database via `prisma/seed.ts`
- `npx shadcn@latest add <component>` — add a shadcn/ui component
- `npx ts-node prisma/migrate-supplies.ts` — one-shot script that migrates legacy `GroceryItem` + `Equipment` rows into the unified `Supply` table (see Data Model)

No test runner is configured yet; verify changes via `npm run lint`, `npm run build`, and manual exercise of the dev server.

## Architecture

### Authentication & Tenancy

The app is multi-tenant via `FamilyGroup`. Each group has its own `passwordHash` (bcrypt) and a name. There is **no per-user auth** — every member of a group shares the same group password.

- Login (`/login`) accepts a group name + password; on success, `createAuthToken(groupId, groupName)` in `src/lib/auth.ts` issues a JWT (HS256, 30-day expiry, `AUTH_SECRET` env) stored in the `cms-auth` httpOnly cookie.
- `src/middleware.ts` gates all routes except `/login`, `/api/auth`, `/api/groups` (create + reset-password), the `/join/*` invite flow, `GET /api/families`, and `/api/families/verify`.
- `getCurrentGroup()` in `lib/auth.ts` is the canonical way for server code to read the active group from the cookie. Client code uses the `useCurrentGroup` hook.
- `APP_PASSCODE` is no longer the auth mechanism — only `AUTH_SECRET` matters for token signing.

### Family Identity (client-side)

Each `FamilyGroup` has many `Family` rows. After login, the user picks their family at `/select-family`; the selection lives in `localStorage` (`cms-current-family-id` / `cms-current-family-name`) and is exposed via the `useCurrentFamily` hook, which broadcasts changes through a custom `cms-family-changed` window event so multiple hook instances stay in sync. Families may have a 4-digit `pin` for verification on sensitive edits; the Prisma client is configured with `omit: { family: { pin: true } }` so `pin` is never returned by default.

The `Family` that created an event is the **organizer** and has admin privileges within that event (checked via `useIsOrganizer`).

### Event Lifecycle (date-derived)

Event status used to live in a column; it's now **derived from dates** via `getEventPhase()` in `src/lib/event-phase.ts`. Phases: `signup → planning → live → settlement → done`, plus `cancelled`. The `CampingEvent.status` column is only consulted to flag `"cancelled"` — every other phase flows from `startDate` / `endDate` / `signupDeadline` and (for `done`) whether all settlements are recorded. **Don't add a manual status field for a new phase** — extend `getEventPhase()` instead.

### Settlements

Expenses are split equally across all signed-up families (except those with `EventSignup.noExpenses = true`). The settlement algorithm is the **centralized-hub** pattern, implemented identically in `src/lib/settlement-status.ts` and `/api/events/[eventId]/expenses/summary`: the largest net creditor becomes the hub, every debtor pays the hub, and the hub pays every other creditor. Recorded payments live in `SettlementPayment` (`@@unique([eventId, fromFamilyId, toFamilyId])`). "All settled" means every required transaction has a matching `SettlementPayment` row; when true, post-`endDate` events advance from `settlement` → `done`. Keep these two implementations in sync — if you change the algorithm in one, change the other.

Families can publish a `paypalMe` handle that the settlement UI deep-links to.

### Data Model (Prisma)

- **FamilyGroup** — tenant; has password hash, families, events, feedback.
- **Family** — belongs to a group (`@@unique([groupId, name])`); central identity linking signups, meal/activity/supply volunteering, expenses, and settlement payments.
- **CampingEvent** — has one organizer Family and one Group; `inviteCode` (uuid) powers `/join/[code]`.
- **EventSignup** — RSVP with headcount (adults, kids, elderly, vegetarians) and a `noExpenses` flag.
- **Meal / MealVolunteer / FoodItem / FoodItemVolunteer** — meals have volunteers; each food item can also be claimed individually by name.
- **Activity / ActivityVolunteer** — activities have an optional leader Family and target group (all/kids/adults/elderly).
- **Supply / SupplyVolunteer** — the unified gear+groceries list (category, assignment, notes, sortOrder).
- **Expense / SettlementPayment** — see Settlements above.
- **Feedback** — in-app feedback collector (page + family/group context).

All event-child models cascade-delete with the event. `FamilyGroup` deletion cascades to its families and events.

### Server Actions vs API Routes

- `src/app/actions.ts` (~600 lines) holds all mutation server actions used by RSC pages and form handlers. Actions use Prisma transactions where multi-step and call `revalidatePath` on the relevant event path.
- `src/app/api/` mirrors the data model for **client-fetch** endpoints. Event-scoped routes live under `/api/events/[eventId]/` (signups, meals, activities, supplies, expenses, settlements). Group/family/auth/blob/feedback/upload routes are top-level.

When adding a mutation, prefer a server action unless a client component needs to call it from `fetch`/SWR-style code.

### UI Stack

- **shadcn/ui** (new-york style) + Tailwind CSS v4 + Radix primitives in `src/components/ui/`
- **lucide-react** icons, **sonner** toasts. Dark-only theme (deep forest oklch palette in `globals.css`) — no light mode, no theme toggle. Style new UI with dark-mode tokens (`bg-card`, `text-muted-foreground`) or color-shade accents like `bg-emerald-950/30 border-emerald-800/50` + `text-emerald-400` (see `event-dashboard-client.tsx` for the established palette).
- **@dnd-kit** for drag-and-drop reordering (used in Supplies)
- **@vercel/blob** for event-image uploads (`/api/blob`, `/api/upload`)

Component layout:
- `src/components/ui/` — shadcn primitives
- `src/components/layout/` — `AppHeader`, `EventTabs`
- `src/components/shared/` — reusable app pieces (`EventAccessGuard`, `FamilyAvatar`, `FeedbackButton`, `InviteLinkCard`, `ConfirmDeleteDialog`, etc.)
- `src/components/claimable/` — shared "list with claim/assign/category" UX that powers the Supplies tab (`ClaimablePage`, `CategorySection`, `AssignPanel`, `ItemCard*`, plus a domain adapter in `supply-domain.tsx` and the `useClaimableItems` hook). If you extend Supplies UX, extend `claimable/` rather than re-implementing alongside it.
- `src/components/bulk-import/` — paste-import and category-first bulk-add dialogs used by the Supplies page
- `src/components/events/` — event-specific dashboards

### Event Pages & Navigation

`EventTabs` (`src/components/layout/event-tabs.tsx`) renders the per-event navigation: Overview, Sign Up, Meals, **Supplies**, Activities, Expenses. Each tab is a route under `src/app/events/[eventId]/`. The shared `layout.tsx` at that level fetches the event once and renders the header + tabs; `EventAccessGuard` then verifies the current family is signed up before showing child content.

### Invite Flow

Events expose a stable `inviteCode` UUID. `/join/[code]` and `/api/join/[code]` (both whitelisted in middleware) let a new family land directly on an event without being logged into the group yet — used to share the link in chat without leaking the group password.

### Hooks

- `useCurrentFamily()` — localStorage-backed, cross-instance synced via custom event
- `useCurrentGroup()` — reads the active group context
- `useIsOrganizer(eventId)` — fetches the event and compares `organizerFamilyId` against the current family

### Database

Neon PostgreSQL. Two connection strings: `DATABASE_URL` (pooled, what the app uses) and `DIRECT_URL` (direct, used by Prisma for migrations). `src/lib/prisma.ts` wires up `PrismaNeon` and polyfills `ws` for Node.js runtimes. The `prisma/dev.db` file in the repo is an unused SQLite leftover — the schema is PostgreSQL-only.
