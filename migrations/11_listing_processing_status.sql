ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('pending', 'processing', 'active', 'sold', 'inactive'));

ALTER TABLE listings ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed'
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

CREATE INDEX IF NOT EXISTS idx_listing_images_status
  ON listing_images(status);