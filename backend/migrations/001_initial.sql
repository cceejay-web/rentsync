-- migrations/001_initial.sql

-- ── Users ────────────────────────────────────────────────────────────────────
-- Stores both property managers and tenants; role column distinguishes them.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255)        NOT NULL,
  full_name     VARCHAR(255)        NOT NULL,
  phone         VARCHAR(20),                      -- M-Pesa number (254XXXXXXXXX)
  role          VARCHAR(10)         NOT NULL CHECK (role IN ('manager', 'tenant')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ── Properties ───────────────────────────────────────────────────────────────
-- A property belongs to one manager. ON DELETE RESTRICT prevents accidental
-- orphaning of units/leases/payments if a user record is ever deleted.
-- Account closure should use soft-delete (deleted_at) not hard DELETE.
CREATE TABLE properties (
  id         SERIAL PRIMARY KEY,
  owner_id   INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name       VARCHAR(255) NOT NULL,
  address    TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Units ────────────────────────────────────────────────────────────────────
-- Each unit belongs to one property. (property_id, unit_number) must be unique
-- so "Unit 3" can exist in two different buildings without conflict.
CREATE TABLE units (
  id           SERIAL PRIMARY KEY,
  property_id  INTEGER        NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  unit_number  VARCHAR(50)    NOT NULL,
  monthly_rent DECIMAL(10, 2) NOT NULL,
  status       VARCHAR(10)    NOT NULL DEFAULT 'vacant'
                              CHECK (status IN ('vacant', 'occupied')),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, unit_number)
);

-- ── Leases ───────────────────────────────────────────────────────────────────
-- Links a tenant to a unit for a period. monthly_rent is snapshotted at
-- signing so that future rent changes on the unit don't rewrite history.
-- end_date is nullable to support open-ended / month-to-month leases.
CREATE TABLE leases (
  id           SERIAL PRIMARY KEY,
  unit_id      INTEGER        NOT NULL REFERENCES units(id)  ON DELETE RESTRICT,
  tenant_id    INTEGER        NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  start_date   DATE           NOT NULL,
  end_date     DATE,
  monthly_rent DECIMAL(10, 2) NOT NULL,
  status       VARCHAR(15)    NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'expired', 'terminated')),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── Payments ─────────────────────────────────────────────────────────────────
-- One row per STK Push attempt. checkout_request_id is set when we initiate
-- the push; mpesa_receipt is set when the Daraja callback confirms success.
-- Both UNIQUE constraints are the Sync Engine's idempotency guards:
--   • checkout_request_id ensures we never create two pending records for
--     the same push.
--   • mpesa_receipt ensures a duplicate callback never credits a tenant twice.
CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  lease_id            INTEGER        NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
  tenant_id           INTEGER        NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  amount              DECIMAL(10, 2) NOT NULL,
  phone_number        VARCHAR(20)    NOT NULL,
  checkout_request_id VARCHAR(100)   UNIQUE,
  mpesa_receipt       VARCHAR(50)    UNIQUE,
  status              VARCHAR(10)    NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'completed', 'failed')),
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── M-Pesa callback log ──────────────────────────────────────────────────────
-- Every raw Daraja callback is written here before any processing begins.
-- Required by Sync Engine rules ("log everything") and provides a replay
-- source if a bug causes a callback to be mishandled.
CREATE TABLE mpesa_callbacks (
  id                  SERIAL PRIMARY KEY,
  checkout_request_id VARCHAR(100),
  raw_body            JSONB        NOT NULL,
  processed           BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- FK columns that appear frequently in WHERE clauses.
-- PK and UNIQUE columns already get indexes automatically from Postgres.
CREATE INDEX idx_properties_owner     ON properties      (owner_id);
CREATE INDEX idx_units_property       ON units           (property_id);
CREATE INDEX idx_leases_unit          ON leases          (unit_id);
CREATE INDEX idx_leases_tenant        ON leases          (tenant_id);
CREATE INDEX idx_payments_lease       ON payments        (lease_id);
CREATE INDEX idx_payments_tenant      ON payments        (tenant_id);
CREATE INDEX idx_mpesa_callbacks_crid ON mpesa_callbacks (checkout_request_id);

-- Postgres filtered (partial) index — enforces the one-active-lease-per-tenant
-- invariant at the DB level regardless of which code path creates the lease.
-- 'active' is the only status that can conflict; 'expired'/'terminated' rows
-- are historical and may coexist freely.
CREATE UNIQUE INDEX one_active_lease_per_tenant
  ON leases (tenant_id)
  WHERE status = 'active';
