-- One on-chain tx hash may settle at most one execution (global per chain).
CREATE TABLE IF NOT EXISTS settlement_tx_claims (
  chain_id BIGINT NOT NULL,
  tx_hash TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  execution_id TEXT NOT NULL,
  intent_id TEXT NOT NULL REFERENCES financial_intents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chain_id, tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_settlement_tx_claims_execution
  ON settlement_tx_claims (organization_id, execution_id);
