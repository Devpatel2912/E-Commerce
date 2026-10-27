CREATE TABLE IF NOT EXISTS listing_images (
  image_id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL
    REFERENCES listings(listing_id)
    ON DELETE CASCADE,
  image_url VARCHAR(500),
  object_key VARCHAR(500),
  content_type VARCHAR(100),
  file_size BIGINT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS object_key VARCHAR(500);
ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);
ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE listing_images ALTER COLUMN image_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id
  ON listing_images(listing_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_images_object_key
  ON listing_images(object_key) WHERE object_key IS NOT NULL;
