-- Define native PostgreSQL ENUM types for listing and image status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status_enum') THEN
        CREATE TYPE listing_status_enum AS ENUM ('pending', 'processing', 'active', 'sold', 'inactive');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_image_status_enum') THEN
        CREATE TYPE listing_image_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
    END IF;
END $$;

-- Convert listings.status to listing_status_enum
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ALTER COLUMN status DROP DEFAULT;
ALTER TABLE listings ALTER COLUMN status TYPE listing_status_enum USING status::listing_status_enum;
ALTER TABLE listings ALTER COLUMN status SET DEFAULT 'pending'::listing_status_enum;

-- Convert listing_images.status to listing_image_status_enum
ALTER TABLE listing_images DROP CONSTRAINT IF EXISTS listing_images_status_check;
ALTER TABLE listing_images ALTER COLUMN status DROP DEFAULT;
ALTER TABLE listing_images ALTER COLUMN status TYPE listing_image_status_enum USING status::listing_image_status_enum;
ALTER TABLE listing_images ALTER COLUMN status SET DEFAULT 'pending'::listing_image_status_enum;

