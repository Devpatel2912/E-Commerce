CREATE TABLE IF NOT EXISTS search_history (
  search_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  category_id INTEGER
    REFERENCES categories(id)
    ON DELETE SET NULL,
  min_price NUMERIC(12, 2)
    CHECK (min_price IS NULL OR min_price >= 0),
  max_price NUMERIC(12, 2)
    CHECK (max_price IS NULL OR max_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_search_history_price_range
    CHECK (min_price IS NULL OR max_price IS NULL OR min_price <= max_price)
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_created
  ON search_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_category_id
  ON search_history (category_id);
