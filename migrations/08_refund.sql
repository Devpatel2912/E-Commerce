CREATE TABLE IF NOT EXISTS refunds (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL
    REFERENCES payments(id)
    ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount > 0),
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'pending', 'processing', 'completed', 'succeeded', 'failed', 'rejected')),
  provider_refund_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id
  ON refunds(payment_id);

CREATE INDEX IF NOT EXISTS idx_refunds_status
  ON refunds(status);
