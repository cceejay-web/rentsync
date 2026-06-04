# RentSync — Property and Rent Management Platform

A two-sided web application for Kenyan landlords and tenants. Landlords manage properties, units, and tenants; tenants access a self-service portal for their lease, payments, requests, and unit applications. M-Pesa STK Push integration via Safaricom Daraja API.

Built as a final-year project at JKUAT by Sean Amutavy.

## Features

**Landlord side:**
- Property and unit management with detailed unit fields (bedrooms, bathrooms, size)
- Tenant management with lease creation
- M-Pesa rent collection via STK Push (Daraja sandbox)
- Real-time payment reconciliation via webhook callbacks
- Maintenance request inbox with workflow state machine
- Unit application review with atomic move workflow
- Operational reports (occupancy, revenue, lease status)

**Tenant side:**
- Self-service login
- View current lease, unit details, and landlord contact
- Payment history (read-only)
- File maintenance and complaint requests
- Browse available units from current landlord
- Apply to move to another unit
- FAQ chatbot

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL 16, JWT auth, bcryptjs, axios
- **Frontend:** React 18, Vite, Ant Design v5, Recharts, dayjs
- **M-Pesa:** Safaricom Daraja API (Lipa Na M-Pesa Online / STK Push)
- **Dev tooling:** ngrok (for callback testing)

## Prerequisites

- Node.js 18 or later
- PostgreSQL 16 or later
- npm
- (Optional, for M-Pesa testing) ngrok account, Safaricom Daraja sandbox account

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/rentsync.git
cd rentsync
```

### 2. Set up the database

```bash
createdb rentsync
psql rentsync -f backend/migrations/001_initial.sql
psql rentsync -f backend/migrations/002_tenant_portal.sql
```

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your local Postgres connection (default: `postgresql://YOUR_USERNAME@localhost:5432/rentsync`)
- `JWT_SECRET` — any random string; generate with `openssl rand -hex 32`
- M-Pesa fields can stay blank unless testing payments

Start the backend:

```bash
node src/server.js
```

You should see `Server running on port 5000`.

### 4. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite starts on http://localhost:5173.

### 5. First accounts

Sign up as a manager. Create a property, add a unit, then add a tenant (set their password in the form).

Sign out, open an incognito window, log in as the tenant to see the tenant portal.

## M-Pesa setup (optional)

To test the Sync Engine:

1. Register at https://developer.safaricom.co.ke
2. Create an app, subscribe to "M-Pesa Sandbox" and "Lipa Na M-Pesa Online"
3. Copy Consumer Key and Consumer Secret
4. Install ngrok and run: `ngrok http 5000`
5. Fill the M-Pesa block in `.env`:

```
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=<your-key>
MPESA_CONSUMER_SECRET=<your-secret>
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=<your-ngrok-url>/api/mpesa/callback
```

6. Restart the backend.

Sandbox test phone: `254708374149` (Safaricom's official test number).

Note: ngrok free tier rotates the URL every session.

## Helper scripts

In `backend/scripts/`:

- `test-daraja.js` — verifies Daraja credentials
- `simulate-callback.js <checkout_request_id> [success|fail]` — POST a simulated M-Pesa callback
- `demo-full-flow.js` — end-to-end demo flow (login, find lease, initiate STK Push, simulate callback)

## Documentation

See `CLAUDE.md` for the complete design log: architectural decisions, trade-offs, security patterns, and known issues are documented there.

## Known limitations

- Tenant passwords are set by the landlord at tenant creation; no self-service password reset
- Lease expiry is not auto-enforced
- Stale pending payments are not auto-timed out
- FAQ chatbot is rule-based; no LLM
- No email/SMS notifications

## License

Submitted as part of a university final-year project. Not licensed for commercial use without permission.

## Author

Sean Amutavy  
JKUAT, 2026
