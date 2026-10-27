CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  listing_id BIGINT NOT NULL
    REFERENCES listings(listing_id)
    ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON payments(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_listing_id
  ON payments(listing_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments(status);
