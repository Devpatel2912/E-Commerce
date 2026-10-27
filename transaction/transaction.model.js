import pool from "../config/db.js";

export const createTransaction = async ({
  paymentId,
  transactionType = "payment",
  amount,
  currency = "INR",
  providerTransactionId = null,
  status = "pending",
}) => {
  const query = `
    INSERT INTO transactions (
      payment_id,
      transaction_type,
      amount,
      currency,
      provider_transaction_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, payment_id, transaction_type, amount, currency,
              provider_transaction_id, status, created_at
  `;

  const { rows } = await pool.query(query, [
    paymentId,
    transactionType,
    amount,
    currency,
    providerTransactionId,
    status,
  ]);

  return rows[0];
};

export const getTransactionsByUser = async ({
  userId,
  type = "all",
  limit = 20,
  offset = 0,
}) => {
  const conditions = [];
  const values = [];

  values.push(userId);

  conditions.push(`
    (
      p.user_id = $1
      OR l.user_id = $1
    )
  `);

  if (type === "purchase") {
    conditions.push("p.user_id = $1");
  } else if (type === "sale") {
    conditions.push("l.user_id = $1 AND p.user_id <> $1");
  }

  values.push(limit);
  const limitParam = `$${values.length}`;

  values.push(offset);
  const offsetParam = `$${values.length}`;

  const query = `
    SELECT
      t.id,
      t.payment_id,
      t.transaction_type,
      t.amount,
      t.currency,
      t.provider_transaction_id,
      t.status,
      p.user_id AS buyer_id,
      l.user_id AS seller_id,
      p.listing_id,
      l.price AS listing_price,
      l.status AS listing_status,
      t.created_at
    FROM transactions t
    INNER JOIN payments p ON p.id = t.payment_id
    INNER JOIN listings l ON l.listing_id = p.listing_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY t.created_at DESC, t.id DESC
    LIMIT ${limitParam}
    OFFSET ${offsetParam}
  `;

  const { rows } = await pool.query(query, values);
  return rows;
};

export const countTransactionsByUser = async ({ userId, type = "all" }) => {
  const conditions = ["(p.user_id = $1 OR l.user_id = $1)"];

  const values = [userId];

  if (type === "purchase") {
    conditions.push("p.user_id = $1");
  } else if (type === "sale") {
    conditions.push("l.user_id = $1 AND p.user_id <> $1");
  }

  const query = `
    SELECT COUNT(*)::int AS total
    FROM transactions t
    INNER JOIN payments p ON p.id = t.payment_id
    INNER JOIN listings l ON l.listing_id = p.listing_id
    WHERE ${conditions.join(" AND ")}
  `;

  const { rows } = await pool.query(query, values);
  return rows[0].total;
};

export const getTransactionById = async ({ transactionId, userId }) => {
  const query = `
    SELECT
      t.id,
      t.payment_id,
      t.transaction_type,
      t.amount,
      t.currency,
      t.provider_transaction_id,
      t.status,
      t.created_at,
      p.user_id AS buyer_id,
      l.user_id AS seller_id,
      p.listing_id,
      l.price AS listing_price,
      l.status AS listing_status,
      p.provider,
      p.provider_payment_id,
      p.status AS payment_status
    FROM transactions t
    INNER JOIN payments p ON p.id = t.payment_id
    INNER JOIN listings l ON l.listing_id = p.listing_id
    WHERE t.id = $1
      AND (p.user_id = $2 OR l.user_id = $2)
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [transactionId, userId]);

  return rows[0] || null;
};
