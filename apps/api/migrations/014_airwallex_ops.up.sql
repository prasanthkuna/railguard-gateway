-- Airwallex Track 3: payout attempts, incidents, chaos/agent runs and webhook events survive restarts.
CREATE TABLE IF NOT EXISTS airwallex_payout_attempts (
  execution_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,
  state TEXT NOT NULL,
  transfer_id TEXT,
  create_calls INTEGER NOT NULL DEFAULT 0,
  doc TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airwallex_incidents (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  label TEXT NOT NULL,
  doc TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS airwallex_incidents_execution_idx ON airwallex_incidents (execution_id);

CREATE TABLE IF NOT EXISTS airwallex_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  mode TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  request_id TEXT,
  transfer_id TEXT,
  create_calls INTEGER,
  transfers_created INTEGER,
  label TEXT,
  source TEXT NOT NULL,
  doc TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS airwallex_runs_created_idx ON airwallex_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS airwallex_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  accepted BOOLEAN NOT NULL,
  reason TEXT,
  event_id TEXT,
  event_name TEXT,
  transfer_id TEXT,
  request_id TEXT,
  status TEXT
);
CREATE INDEX IF NOT EXISTS airwallex_webhook_events_received_idx ON airwallex_webhook_events (received_at DESC);
