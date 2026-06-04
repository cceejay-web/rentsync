# RentSync — Project Context for Claude Code

## What this project is

RentSync is a **web application** for property and rent management in the Kenyan market. It automates reconciliation between M-Pesa payments and tenant rent records.

This is a final-year undergraduate project at JKUAT. The author (Sean Amutavy, SCT222-0352/2022) is learning while building, so:

- Prefer clear, readable code over clever code.
- Explain trade-offs in plain language when making non-obvious decisions.
- Keep dependencies minimal — don't reach for a library when standard code will do.
- When writing non-trivial logic, walk through the approach in plain English **before** writing the code, so the author can confirm understanding.

## Scope

**This is a web application only.** Do not build, scaffold, or suggest:
- Mobile apps (React Native, Flutter, native iOS/Android, etc.)
- Desktop apps (Electron, Tauri, etc.)
- Browser extensions

The web app should be responsive enough to work on a mobile browser, but no separate mobile codebase.

## Tech stack (do not change without asking)

- **Frontend:** React + Vite + Ant Design + Recharts
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT (with bcrypt for password hashing)
- **Payments:** Safaricom Daraja API (M-Pesa STK Push, sandbox during development)
- **HTTP client (frontend):** axios
- **Routing (frontend):** react-router-dom

## Folder structure

```
rentsync/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/        # Sync Engine lives here
│   │   ├── middleware/
│   │   ├── utils/           # daraja.js, jwt.js, db.js
│   │   └── server.js
│   ├── migrations/          # SQL files
│   ├── scripts/             # demo-full-flow.js, simulate-callback.js, test-daraja.js
│   ├── .env                 # never commit
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── services/
│       └── context/
├── docs/                    # proposal and design docs — DO NOT MODIFY
└── CLAUDE.md
```

**New files added in Sprint 5:**

Backend:
- `routes/tenant.js`, `routes/requests.js`, `routes/applications.js`, `routes/mpesa.js`
- `controllers/tenantController.js`, `controllers/requestsController.js`, `controllers/applicationsController.js`
- `middleware/requireTenant.js`
- `migrations/002_tenant_portal.sql`

Frontend:
- `components/TenantRoute.jsx`, `components/TenantLayout.jsx`
- `pages/TenantHome.jsx`, `TenantLease.jsx`, `TenantPayments.jsx`, `TenantRequests.jsx`
- `pages/TenantAvailable.jsx`, `TenantApplications.jsx`, `TenantHelp.jsx`
- `pages/ManagerRequests.jsx`, `ManagerApplications.jsx`

## Coding conventions

- Use `async/await`, never raw promises with `.then()`.
- All money is stored as `DECIMAL`, never as `FLOAT` or `NUMBER`.
- Environment variables go in `.env` (never commit). Update `.env.example` whenever a new variable is added.
- Database queries use parameterised queries only. Never string-concatenate SQL.
- Every backend route that touches user data must check authentication.
- Backend route data must be scoped to the logged-in user's records (a manager only sees their own properties, a tenant only sees their own lease and payments).
- Use ES modules (`"type": "module"` in `package.json`) on both frontend and backend.
- Frontend pages use Ant Design components by default — don't write custom CSS unless necessary.
- Visual style follows the existing screenshots: dark navy sidebar, white content area, blue primary buttons, gradient stat cards on the Dashboard.

## Sync Engine — non-negotiable rules

The Sync Engine is the core research contribution. It must:

- **Be idempotent.** A duplicate Daraja callback must never credit a tenant twice. Use the `mpesa_receipt UNIQUE` constraint as a hard safety net plus an explicit status check.
- **Match callbacks correctly.** Use `CheckoutRequestID` to link a callback to the payment we initiated.
- **Handle stray callbacks.** If a callback arrives for a `CheckoutRequestID` we don't recognise, log and ignore — never create new records from a callback alone.
- **Never trust callback data blindly.** Validate the source and the structure before processing.
- **Log everything.** Every callback received, every reconciliation attempt, every error.

## What NOT to do

- Don't install ORM frameworks (Prisma, Sequelize, TypeORM) without asking first — raw SQL with `pg` is fine for this project.
- Don't install auth libraries (Passport, NextAuth) without asking — `jsonwebtoken` and `bcrypt` are enough.
- Don't generate large multi-file changes in one turn. Work in small, reviewable steps.
- Don't run `npm install <package>` without telling the author what it's for and waiting for confirmation.
- Don't modify files in `/docs` — the proposal lives there.
- Don't add TypeScript. The project is JavaScript only.
- Don't add testing frameworks until Sprint 5.
- Don't deploy or push to any remote without being asked.

## Working style

- One task per turn. If a request is too big, push back and propose breaking it down.
- Show the diff before applying large changes.
- After completing a task, suggest a git commit message.
- If a request conflicts with anything in this file, flag it and ask before proceeding.
- If something is unclear or ambiguous, ask — don't guess.

## Current sprint

**Sprint 2: Auth & Core CRUD** ✅ — login/signup flows, JWT middleware, database utility, and the first real CRUD pages (Properties, Units).

Goals for this sprint:
- [x] `backend/src/utils/db.js` — pg Pool connected via `DATABASE_URL`
- [x] `POST /auth/signup` — hash password with bcrypt, insert user, return JWT
- [x] `POST /auth/login` — verify password, return JWT
- [x] `backend/src/middleware/requireAuth.js` — verify JWT, attach `req.user`, reject unauthenticated requests
- [x] `deleted_at TIMESTAMPTZ` added to `users` in `001_initial.sql`
- [x] Frontend `AuthContext` — store JWT in `localStorage`, expose `login`, `logout`, `user`
- [x] Frontend `ProtectedRoute` — redirect to `/login` if no token
- [x] Login page — Ant Design form, calls `POST /auth/login`, stores token, redirects to `/dashboard`
- [x] Signup page — Ant Design form, calls `POST /auth/signup`, auto-logs in, redirects to `/dashboard`
- [x] 9.5 — Role-based access control (manager/tenant) — backend `requireManager` middleware, frontend `ManagerRoute` guard, sidebar filtering
- [x] `GET/POST /properties` and `GET/PUT/DELETE /properties/:id` — manager-scoped
- [x] Properties page — list, add, edit, delete using Ant Design Table + Modal
- [x] Units API — nested routes `/api/properties/:propertyId/units`, full CRUD, nested-resource security verified end-to-end
- [x] Units page — `/properties/:id` property detail view with units table, create/edit/delete Modal, currency formatting, status Tags
- [x] Tenants API — `GET/POST /api/tenants`, `GET/PUT /api/tenants/:id`, `POST /api/tenants/:id/terminate`; atomic transactions, cross-manager isolation, partial unique index verified
- [x] Tenants page — `/tenants` with vacant-unit picker, monthly_rent auto-fill, edit form, conditional Terminate button; `GET /api/units/vacant` endpoint added

---

**Sprint 3: Reports, Charts & Visual Redesign** — Reports page with Recharts charts, visual redesign (warm + bold direction), dashboard improvements. Reordered ahead of Sprint 4 to produce a demoable, visually complete artifact at each supervisor check-in and to let the Reports design inform what data the Payments feature will need to surface.

---

**Sprint 4: Sync Engine & Payments** — Daraja STK Push integration, `mpesa_callbacks` handling, idempotent reconciliation, Payments page. Deferred behind Reports to reduce external-dependency risk on the M-Pesa sandbox.

#### Sprint 4 prerequisites (completed — do not repeat)

- Daraja sandbox account registered at developer.safaricom.co.ke; app created with M-Pesa Sandbox + STK Push products subscribed.
- `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` in `backend/.env`.
- Shared sandbox shortcode `174379` and its passkey in `backend/.env` as `MPESA_SHORTCODE` and `MPESA_PASSKEY`.
- Sandbox test phone number: **254708374149** — Safaricom's official STK Push test number.
- ngrok installed and account configured. Tunnel verified by curl to `/health` through the public URL.
- `MPESA_CALLBACK_URL` placeholder in `backend/.env`.
- Daraja OAuth verified — `POST /oauth/v1/generate` returns 200 with `access_token`.
- `.gitignore` files in place (backend + frontend + root) protecting `.env` from commits.

#### Session-start checklist for Sprint 4 work

Every time ngrok restarts it gets a fresh subdomain. Before doing any STK Push testing:

1. Start ngrok: `ngrok http 5000`
2. Copy the `https://` forwarding URL from ngrok output.
3. Update `MPESA_CALLBACK_URL` in `backend/.env` to `<ngrok-url>/api/mpesa/callback`.
4. Restart the backend so the new URL is loaded from env.

#### Sandbox → production

The same code path works in production with different `.env` values: swap `MPESA_BASE_URL` from `https://sandbox.safaricom.co.ke` to `https://api.safaricom.co.ke`, replace the sandbox shortcode and passkey with the landlord's registered Paybill credentials. Sandbox-to-production is a configuration change only, not a code change — defensible point for viva.

---

**Sprint 5: Tenant Portal & Feature Completion** ✅ — full tenant portal, requests system, unit move applications, FAQ chatbot, unit detail fields. Feature-complete. Dissertation and viva preparation underway.

Completed:
- [x] Stage 1 — DB migration (`002_tenant_portal.sql`): `requests`, `unit_applications` tables; `bedrooms`/`bathrooms`/`size_sqm`/`description` columns on `units`
- [x] Stage 2 — Manager-set tenant passwords; tenants can now log in
- [x] Stage 3 — Tenant routing shell: `TenantRoute` guard, `TenantLayout`, bidirectional role redirects
- [x] Stage 4 — Tenant My Lease page
- [x] Stage 5 — Tenant Payments view (read-only)
- [x] Stage 6 — Requests system: tenant filing + manager inbox with state machine
- [x] Stage 7 — Tenant Available Units browse
- [x] Stage 8 — Unit move applications: tenant apply + manager approve/reject with atomic 5-step transaction
- [x] Stage 9 — Unit detail fields (bedrooms, bathrooms, size, description) on manager forms and table
- [x] Stage 10 — Tenant FAQ chatbot (rule-based keyword matching)

---

**Sprint 1: Foundation** ✅ — skeleton, folder structure, database schema, routing, sidebar.

Completed:
- [x] Backend Express server runs with `/health` endpoint
- [x] PostgreSQL schema created from `migrations/001_initial.sql` (6 tables confirmed)
- [x] Frontend Vite + React app runs with routing
- [x] Sidebar navigation with Ant Design dark menu
- [x] Empty pages: Login, Signup, Dashboard, Properties, Tenants, Payments, Reports

## Known limitations

- Tenant passwords are set by the landlord at tenant creation; no self-service password reset in the portal.
- Lease expiry is not auto-enforced — expired leases stay `active` in the DB until manually terminated.
- Stale pending payments (STK Push initiated but no callback received) are not auto-timed out.
- Move-date workflow in applications is immediate; no future-dated lease transitions.
- No email or SMS notifications when applications are decided or requests updated.
- FAQ chatbot is rule-based keyword matching; no LLM, no conversation memory.

---

## Notes & decisions

*Append decisions and trade-offs here as the project progresses. This helps future sessions stay in context.*

### Sprint 5 closeout

Sprint 5 extended RentSync from a landlord-only management tool into a two-sided platform with a full tenant portal. Tenants now log in with manager-set passwords, view their lease, browse available units from their landlord, file maintenance requests, apply to move units, view payment history, and use a rule-based FAQ chatbot. Landlords get an inbox for requests and applications, with full state machines and audit trails. The applications approval flow is the most architecturally significant addition — a 5-step atomic transaction with FOR UPDATE concurrency protection that terminates the old lease, vacates the old unit, creates the new lease, occupies the new unit, and marks the application approved as one COMMIT.

### Sprint ordering rationale

- Sprints 3 and 4 were swapped from the original plan (Reports was Sprint 4, Sync Engine was Sprint 3). Reasons: (1) a visually complete app is demoable at every supervisor check-in regardless of M-Pesa sandbox status; (2) Daraja integration carries external-dependency risk — sandbox behaviour can change, ngrok tunnels expire, Safaricom rate-limits test numbers; (3) the Reports design will reveal what aggregations and fields the Payments page actually needs to surface, so building Reports first avoids rework.

### Sprint 2 closeout

- Sprint 2 delivered a working property/unit/tenant management system. Manager logs in → sees their properties → drills into a property to see units → can add tenants to vacant units, edit lease terms, and terminate active leases. All operations are atomic and isolated between managers. Tenant accounts are created at the data level but not yet login-capable (deferred to Sprint 3+).
- Engineering throughline: every endpoint scopes data by `owner_id`, every nested resource verifies its parent's ownership, every multi-write operation runs in a transaction, every unique constraint has a constraint-specific error message, every form validates before the DB is touched. Defence in depth applied consistently.

- Schema uses `ON DELETE RESTRICT` throughout for audit integrity. Account closure handled via soft-delete (`deleted_at` column on `users`, added in Sprint 2 auth work).
- Added `mpesa_callbacks` table to log raw Daraja callbacks before processing — supports replay and audit.
- `monthly_rent` is snapshotted on `leases` at signing so unit rent changes don't rewrite history.
- Migration discipline kept lightweight during development — schema changes amend `001_initial.sql` and the local DB is dropped/recreated. Switch to additive migrations (`002`, `003`, etc.) at first production deployment.
- Auth uses `bcryptjs` (pure JS) over `bcrypt` (native) for build portability — speed difference negligible at our traffic.
- Login uses identical 401 messages and HTTP status for invalid email vs invalid password to prevent user enumeration. Timing oracle (always running `bcrypt.compare` against a dummy hash for unknown emails) deferred to production hardening.
- Email addresses normalised to lowercase on both signup and login to ensure consistent lookups regardless of case variation.
- JWT tokens expire after 7 days. No refresh-token mechanism — stolen tokens valid for full window. Acceptable for MVP; switch to short-lived access tokens + refresh tokens before any production deployment.
- Auth tokens stored in localStorage. Trade-off: persists across browser restarts (better UX) but vulnerable to XSS. Acceptable for MVP scope; production would migrate to httpOnly cookies.
- AuthContext decodes JWT client-side via `atob()` on initial load instead of calling `/api/auth/me` — faster boot, but stale data is possible if user details change after token issue. Token expiry is checked client-side to prevent showing 'logged in' state with an already-expired token.
- Signup auto-logs-in the user and routes directly to `/dashboard`. Re-entering credentials at `/login` post-signup adds friction without security benefit since the user just proved ownership of the password.
- CORS scoped to `http://localhost:5173` (Vite dev origin) rather than wildcard. Production deployment will read this from env var.
- Ant Design v5 message API uses contextual hook (`App.useApp()`) rather than static import — required for toasts to display correctly with the App provider wrapper.
- Logout flow: dropdown menu in topbar with Sign Out option. Calls `AuthContext.logout()` which clears localStorage and resets user state. `ProtectedRoute` then redirects on next render.
- Topbar displays live user data from `useAuth()` — avatar = first letter of email, top line = email, bottom line = capitalised role. `full_name` is not in the JWT payload (token signed with `id`/`email`/`role` only); displaying it would require either embedding name in token or a `/api/auth/me` boot call. Deferred.
- Vite scaffolded with React 19 by default; Ant Design v5 officially supports React 16–18. Console shows a compatibility warning at startup, but everything works. The contextual message API (`App.useApp()`) is required to avoid silently failing toasts. Note this if compatibility issues emerge later — pinning React to 18 is an option.
- Manager-only routes (Properties, Tenants, Payments, Reports) protected at three layers: backend middleware (`requireManager` returns 403), frontend route guard (`ManagerRoute` redirects to `/dashboard`), and Sidebar UI filtering (menu items hidden by role). Defence in depth ensures a tenant cannot bypass via URL manipulation, direct API call, or DevTools.
- `requireManager` exported as `[requireAuth, checkManager]` array — Express flattens middleware arrays, so a single import composes both checks at the route definition.
- `ManagerRoute` redirects to `/dashboard` (not `/login`) on role failure — the user is authenticated, just wrong role, so `/login` would be misleading.
- Centralised axios client at `services/api.js` with two interceptors: request attaches `Authorization` header from localStorage, response handles 401 by clearing token and hard-redirecting to `/login`. Hard redirect via `window.location.href` (vs React Router `navigate`) is intentional — axios interceptors run outside the React tree where hooks aren't available, and the full reload cleanly resets state.
- All scoped queries use `owner_id = req.user.id` for cross-manager isolation. Unowned IDs return 404, never 403, so attackers cannot enumerate which IDs exist via the response code.
- Single Modal+Form for both create and edit on the Properties page. `editingProperty` state distinguishes the two modes; `form.setFieldsValue` on edit-open and `form.resetFields` on close prevents stale values bleeding between operations.
- Units API uses nested routes (`/api/properties/:propertyId/units`) with `mergeParams: true` on the Express Router. The URL itself enforces the parent-child relationship rather than relying on body fields.
- Nested-resource security uses a hybrid pattern: JOIN with `properties` table for SELECT queries (cleaner read query), EXISTS subquery for UPDATE/DELETE (since portable SQL doesn't support JOIN in those statements). Both ensure the ownership check happens atomically with the unit query.
- List endpoint splits ownership check from data fetch — without this, an empty result for an unowned property would be indistinguishable from an empty result for an owned-but-no-units property. Two queries: 404 if property not owned, then fetch units.
- Property detail page (`/properties/:id`) fetches both property header and units list fresh on mount rather than passing data via React Router state. Trade-off: one extra round-trip vs deep-link/refresh/share resilience. URLs are fully self-contained — bookmarking and sharing both work without breaking.
- `monthly_rent` rendered with `Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` with a `KSh` prefix, since Postgres DECIMAL serialises as a string. Backend returns `'15000.00'`, frontend displays `KSh 15,000.00`.
- Unit status displayed as Ant Design Tag with semantic colours: green for vacant (positive — available), blue for occupied (neutral — in use). No red — occupancy isn't a problem state.
- Tenants API: a tenant is a `users` row (`role='tenant'`) plus a `leases` row, created atomically in a transaction. The user row has a random `crypto.randomBytes(16).toString('hex')` password, bcrypt-hashed, but the tenant doesn't log in for MVP. The schema supports tenant login in future sprints.
- Bcrypt hashing runs before the transaction opens — bcrypt is CPU-bound (~65ms at cost 10), and holding a pool client open during that time is wasteful. Hash first, transact second.
- Create transaction order: SELECT unit (vacancy + ownership combined) → INSERT user → INSERT lease → UPDATE unit. Re-read tenant via full JOIN inside transaction before COMMIT so a read failure rolls back cleanly — no half-committed state.
- 23505 dispatcher branches on `err.constraint`, not just `err.code`: `users_email_key` returns 409 "email exists", `one_active_lease_per_tenant` returns 409 "tenant already has active lease", anything else re-throws to the 500 handler. Prevents misleading error messages if a new unique constraint is ever added.
- Partial unique index `one_active_lease_per_tenant ON leases(tenant_id) WHERE status = 'active'` enforces the one-active-lease invariant at the database level, regardless of which code path tries to insert. Postgres-specific feature (filtered index) — verified via direct SQL insert that bypasses the API.
- Terminate transaction: single SELECT verifies ownership AND finds lease+unit IDs in one query; two atomic UPDATEs follow. Status filter (`l.status = 'active'`) means terminating an already-terminated lease returns 404 — same as no-such-tenant, no information leak.
- Tenants page Add form: when manager selects a vacant unit, `monthly_rent` auto-fills from that unit's value via `form.setFieldValue` in the Select's `onChange` handler. User can still override. Implements the real-world case where rent is sometimes negotiated below unit standard.
- Tenants page Edit form: always sends all four updatable fields (`full_name`, `phone`, `monthly_rent`, `end_date`). Simpler and more correct than client-side change detection — a few harmless no-op writes are an acceptable trade for avoiding dayjs object-equality bugs and undefined-vs-null edge cases.
- New endpoint `GET /api/units/vacant` — flat list of all vacant units across the manager's properties. Mounted at `/api/units` to avoid collision with the nested `/api/properties/:propertyId/units` mount. Powers the Tenants Add form's unit picker.
- Terminate button conditional rendering: a disabled Button inside Ant Design v5 Popconfirm still triggers the Popconfirm. Pattern is to render Popconfirm + Button when lease is active, plain disabled Button otherwise.
- AuthContext hydrates with DB data via `GET /api/auth/me` after login. Trade-off vs embedding `full_name` in JWT: one extra request per session start, but the JWT stays focused on identity (`id`/`email`/`role`) — display data lives in the DB where it can be updated without forcing logout. Silent fallback to JWT-derived user data if `/me` fails.
- Payment status updates use 5-second polling while pending payments exist. Polling cleanly stops when all payments are resolved. Trade-off vs websockets: simpler implementation, no socket-server infrastructure, acceptable latency. Production at scale would justify websockets.
- Lease status breakdown report had a subtle bug in the first SQL implementation: the WHERE filter combining cross-manager security (owner_id check) with placeholder row preservation (LEFT JOIN to all_statuses CTE) interfered with each other. When manager 2 queried 'active' status, the LEFT JOIN to leases found manager 1's leases, then the LEFT JOIN to properties returned NULL for owner_id mismatch — the WHERE clause then dropped the all_statuses placeholder row along with the cross-manager data. Fix: refactor to filter leases to manager-only FIRST in a CTE subquery, then LEFT JOIN the filtered set to all_statuses. Separation of concerns: security scoping in one place, placeholder preservation in another, no conflict. The lesson: when combining ownership filters with completeness guarantees in the same query, the order of operations matters — filter source data before joining to placeholders, not after.

### Sprint 5 notes

- Manager-set tenant password (Stage 2). Production grade would use magic-link or password-reset emails on first login, deferred as Sprint 6+. Manager-set credentials are an acceptable MVP for property managers who already know their tenants personally and can share credentials via WhatsApp or SMS. Schema and JWT auth pattern extends cleanly to email-based onboarding without breaking changes.
- Tenant routing uses bidirectional role-based redirects (Stage 3). `ManagerRoute` redirects non-managers to `/tenant/home`; `TenantRoute` redirects non-tenants to `/dashboard`; both sit inside a `ProtectedRoute` that handles unauthenticated users. This means a tenant typing any manager URL silently lands on their portal, and vice versa, without 403 pages. Three layers of routing defence: ProtectedRoute → ManagerRoute/TenantRoute → page-level component.
- Application approval transaction (Stage 8). Five operations atomically: UPDATE old lease to terminated, UPDATE old unit to vacant, INSERT new lease as active, UPDATE new unit to occupied, UPDATE application to approved. FOR UPDATE row lock on the target unit prevents race conditions where two managers simultaneously approve different tenants' applications for the same unit. Defensive 23505 catch on `one_active_lease_per_tenant` ensures no double-leasing even if a concurrent transaction also created an active lease. Pre-transaction defensive check on `current_lease.status = 'active'` handles the edge case where a manager terminated the tenant's lease between application and approval.
- Requests state machine (Stage 6) uses forward-only transitions with no reversal. `open → acknowledged | in_progress | closed`; `acknowledged → in_progress | resolved | closed`; `in_progress → resolved | closed`; `resolved → closed`; `closed` → terminal. The state machine is enforced UI-side via the `NEXT_STEPS` map showing only valid next steps. Manager can still edit `manager_response` text on any non-terminal state.
- FAQ chatbot (Stage 10) is rule-based keyword matching, not LLM-backed. Eight FAQ categories with case-insensitive substring matching against the user's question, plus a fallback for unmatched queries. Production would route through Claude API or escalate to landlord chat. Framed in dissertation as Phase 1 (rule-based) vs Phase 2 (LLM-backed conversational support).
