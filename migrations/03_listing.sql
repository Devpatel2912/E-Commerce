CREATE TABLE IF NOT EXISTS listings (
  listing_id BIGSERIAL PRIMARY KEY,

  user_id BIGINT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  category_id BIGINT NOT NULL
    REFERENCES categories(id)
    ON DELETE RESTRICT,

  title VARCHAR(200) NOT NULL,
  description TEXT,

  price NUMERIC(12, 2) NOT NULL
    CHECK (price >= 0),

  condition VARCHAR(20) NOT NULL
    CHECK (condition IN ('new', 'used')),

  location VARCHAR(150) NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'inactive')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_category_id
  ON listings(category_id);

CREATE INDEX IF NOT EXISTS idx_listings_user_id
  ON listings(user_id);

CREATE INDEX IF NOT EXISTS idx_listings_status
  ON listings(status);
