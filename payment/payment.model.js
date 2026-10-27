import pool from "../config/db.js";

export const getPaymentMethods = () => [
  {
    id: "cash",
    name: "Cash on Delivery",
    available: true,
    status: "available",
  },
  {
    id: "online",
    name: "Online Payment",
    available: false,
    status: "coming_soon",
    message: "Online payment is coming soon.",
  },
];

export async function findPurchasableListing(listingId) {
  const result = await pool.query(
    `SELECT listing_id, user_id, price, status
     FROM listings
     WHERE listing_id = $1
     LIMIT 1`,
    [listingId],
  );

  return result.rows[0] ?? null;
}

export async function createCashPayment({ userId, listingId, amount }) {
  const result = await pool.query(
    `INSERT INTO payments
       (user_id, listing_id, amount, currency, provider, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, listing_id, amount, currency,
               provider, provider_payment_id, status`,
    [userId, listingId, amount, "INR", "cash", "pending"],
  );

  return result.rows[0];
}

export async function findPaymentForUser(paymentId, userId) {
  const result = await pool.query(
    `SELECT id, user_id, listing_id, amount, currency,
            provider, provider_payment_id, status
     FROM payments
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [paymentId, userId],
  );

  return result.rows[0] ?? null;
}
