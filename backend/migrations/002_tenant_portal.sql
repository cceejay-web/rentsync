-- Migration 002: Tenant portal infrastructure
-- Adds unit detail fields, maintenance requests table, and unit applications table.

-- ── Units: optional detail fields ──────────────────────────────────────────────
ALTER TABLE units
  ADD COLUMN bedrooms    INT             NULL,
  ADD COLUMN bathrooms   INT             NULL,
  ADD COLUMN size_sqm    NUMERIC(8,2)    NULL,
  ADD COLUMN description TEXT            NULL;

-- ── Maintenance / complaint requests ───────────────────────────────────────────
CREATE TABLE requests (
  id               SERIAL        PRIMARY KEY,
  tenant_id        INT           NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  lease_id         INT           NOT NULL REFERENCES leases(id)  ON DELETE RESTRICT,
  category         VARCHAR(30)   NOT NULL CHECK (category IN ('repair', 'maintenance', 'complaint', 'other')),
  subject          VARCHAR(200)  NOT NULL,
  description      TEXT          NOT NULL,
  status           VARCHAR(20)   NOT NULL DEFAULT 'open'
                                 CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  manager_response TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_requests_tenant ON requests(tenant_id);
CREATE INDEX idx_requests_lease  ON requests(lease_id);
CREATE INDEX idx_requests_status ON requests(status);

-- ── Unit move applications ──────────────────────────────────────────────────────
CREATE TABLE unit_applications (
  id                SERIAL       PRIMARY KEY,
  tenant_id         INT          NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
  current_lease_id  INT          NOT NULL REFERENCES leases(id)  ON DELETE RESTRICT,
  target_unit_id    INT          NOT NULL REFERENCES units(id)   ON DELETE RESTRICT,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  message           TEXT,
  manager_response  TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  decided_at        TIMESTAMPTZ
);

CREATE INDEX idx_applications_tenant      ON unit_applications(tenant_id);
CREATE INDEX idx_applications_target_unit ON unit_applications(target_unit_id);
CREATE INDEX idx_applications_status      ON unit_applications(status);

-- Prevent duplicate pending applications for the same tenant+unit pair.
-- Rejected/approved/withdrawn rows are not affected (same pattern as one_active_lease_per_tenant).
CREATE UNIQUE INDEX one_pending_application_per_tenant_per_unit
  ON unit_applications(tenant_id, target_unit_id)
  WHERE status = 'pending';
