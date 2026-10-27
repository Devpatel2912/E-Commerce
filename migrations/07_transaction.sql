CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL
    REFERENCES payments(id)
    ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'payment'
    CHECK (transaction_type IN ('purchase', 'sale', 'payment', 'refund')),
  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  provider_transaction_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_id
  ON transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions(created_at DESC);
