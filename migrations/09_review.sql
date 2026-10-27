CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  listing_id BIGINT NOT NULL
    REFERENCES listings(listing_id)
    ON DELETE CASCADE,
  rating INTEGER NOT NULL
    CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reviews_user_listing UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing_id
  ON reviews(listing_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON reviews(user_id);
