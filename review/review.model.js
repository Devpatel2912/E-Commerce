import pool from "../config/db.js";
import logger from "../config/logger.js";

export const seedSampleReviews = async () => {
  const checkQuery = `SELECT COUNT(*)::INTEGER AS count FROM reviews;`;
  const { rows } = await pool.query(checkQuery);

  if (rows[0].count > 0) {
    logger.info(
      `Reviews table already contains ${rows[0].count} records. Skipping initial seeding.`,
    );
    return;
  }

  const usersRes = await pool.query(
    `SELECT id FROM users ORDER BY id ASC LIMIT 4;`,
  );
  const listingsRes = await pool.query(
    `SELECT listing_id FROM listings ORDER BY listing_id ASC LIMIT 4;`,
  );

  if (usersRes.rows.length === 0 || listingsRes.rows.length === 0) {
    logger.warn("Cannot seed reviews: users or listings not found.");
    return;
  }

  const sampleReviews = [
    {
      user_id: usersRes.rows[0].id,
      listing_id: listingsRes.rows[0].listing_id,
      rating: 5,
      comment:
        "Outstanding product! Matches the description completely and arrived in perfect shape.",
    },
    {
      user_id: usersRes.rows[1 % usersRes.rows.length].id,
      listing_id: listingsRes.rows[1 % listingsRes.rows.length].listing_id,
      rating: 4,
      comment:
        "Very good quality, works as expected. Fast response from seller.",
    },
    {
      user_id: usersRes.rows[2 % usersRes.rows.length].id,
      listing_id: listingsRes.rows[2 % listingsRes.rows.length].listing_id,
      rating: 5,
      comment: "Excellent value for money. Highly recommend to everyone!",
    },
    {
      user_id: usersRes.rows[3 % usersRes.rows.length].id,
      listing_id: listingsRes.rows[3 % listingsRes.rows.length].listing_id,
      rating: 4,
      comment:
        "Good condition, slight signs of wear but totally worth the price.",
    },
  ];

  for (const review of sampleReviews) {
    await pool.query(
      `INSERT INTO reviews (user_id, listing_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, listing_id) DO NOTHING`,
      [review.user_id, review.listing_id, review.rating, review.comment],
    );
  }

  logger.info("Inserted 4 sample review records successfully.");
};

export const createReview = async ({
  userId,
  userID,
  listingId,
  rating,
  comment,
}) => {
  const query = `
    INSERT INTO reviews (user_id, listing_id, rating, comment)
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      user_id,
      listing_id,
      rating,
      comment,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(query, [
    userId || userID,
    listingId,
    rating,
    comment ?? null,
  ]);

  return rows[0];
};

export const getReviewsByListing = async (listingId, limit, offset) => {
  const query = `
    SELECT
      r.id,
      r.user_id,
      r.listing_id,
      r.rating,
      r.comment,
      r.created_at,
      r.updated_at,
      u.name AS reviewer_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.listing_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const { rows } = await pool.query(query, [listingId, limit, offset]);

  return rows;
};

export const countReviewsByListing = async (listingId) => {
  const query = `
    SELECT
      COUNT(*)::INTEGER AS total,
      COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0) AS average_rating
    FROM reviews
    WHERE listing_id = $1
  `;

  const { rows } = await pool.query(query, [listingId]);
  return rows[0];
};

export const getReviewById = async (reviewId) => {
  const query = `
    SELECT
      r.id,
      r.user_id,
      r.listing_id,
      r.rating,
      r.comment,
      r.created_at,
      r.updated_at,
      u.name AS reviewer_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = $1
  `;

  const { rows } = await pool.query(query, [reviewId]);
  return rows[0] ?? null;
};

export const updateReview = async ({ reviewId, userId, rating, comment }) => {
  const query = `
    UPDATE reviews
    SET
      rating = COALESCE($3, rating),
      comment = CASE
        WHEN $4::BOOLEAN THEN $5::TEXT
        ELSE comment
      END,
      updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING
      id,
      user_id,
      listing_id,
      rating,
      comment,
      created_at,
      updated_at
  `;

  const { rows } = await pool.query(query, [
    reviewId,
    userId,
    rating ?? null,
    comment !== undefined,
    comment ?? null,
  ]);

  return rows[0] ?? null;
};

export const deleteReview = async (reviewId, userId) => {
  const query = `
    DELETE FROM reviews
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;

  const { rows } = await pool.query(query, [reviewId, userId]);
  return rows[0] ?? null;
};

export const listingExists = async (listingId) => {
  const { rows } = await pool.query(
    "SELECT listing_id FROM listings WHERE listing_id = $1",
    [listingId],
  );

  return rows.length > 0;
};
