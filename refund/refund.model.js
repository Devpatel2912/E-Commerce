import pool from "../config/db.js";

const REFUNDABLE_PAYMENT_STATUSES = [
  "succeeded",
  "success",
  "completed",
  "paid",
];

export async function createRefundRequest({
  paymentId,
  userId,
  amount,
  reason,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `SELECT id, user_id, amount, currency, status
       FROM payments
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [paymentId, userId]
    );

    if (paymentResult.rowCount === 0) {
      const error = new Error("Payment not found.");
      error.statusCode = 404;
      throw error;
    }

    const payment = paymentResult.rows[0];

    if (
      !REFUNDABLE_PAYMENT_STATUSES.includes(
        String(payment.status).toLowerCase()
      )
    ) {
      const error = new Error(
        "This payment is not eligible for a refund."
      );
      error.statusCode = 409;
      throw error;
    }

    const existingResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_refunded
       FROM refunds
       WHERE payment_id = $1
         AND LOWER(status) IN (
           'requested', 'pending', 'processing', 'completed', 'succeeded'
         )`,
      [paymentId]
    );

    const alreadyReserved = Number(
      existingResult.rows[0].total_refunded
    );
    const paymentAmount = Number(payment.amount);

    if (amount + alreadyReserved > paymentAmount) {
      const error = new Error(
        "The requested refund exceeds the remaining refundable amount."
      );
      error.statusCode = 409;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO refunds
         (payment_id, amount, reason, status, provider_refund_id)
       VALUES ($1, $2, $3, 'requested', NULL)
       RETURNING *`,
      [paymentId, amount, reason]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getRefundsByUser(userId) {
  const result = await pool.query(
    `SELECT r.*
     FROM refunds r
     INNER JOIN payments p ON p.id = r.payment_id
     WHERE p.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getRefundById(refundId, userId) {
  const result = await pool.query(
    `SELECT r.*
     FROM refunds r
     INNER JOIN payments p ON p.id = r.payment_id
     WHERE r.id = $1 AND p.user_id = $2`,
    [refundId, userId]
  );

  return result.rows[0] ?? null;
}

export async function startRefundProcessing(refundId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT r.id, r.status
       FROM refunds r
       INNER JOIN payments p ON p.id = r.payment_id
       WHERE r.id = $1 AND p.user_id = $2
       FOR UPDATE OF r`,
      [refundId, userId]
    );

    if (result.rowCount === 0) {
      const error = new Error("Refund not found.");
      error.statusCode = 404;
      throw error;
    }

    if (result.rows[0].status !== "requested") {
      const error = new Error(
        "Only requested refunds can enter processing."
      );
      error.statusCode = 409;
      throw error;
    }

    const updated = await client.query(
      `UPDATE refunds
       SET status = 'processing'
       WHERE id = $1
       RETURNING *`,
      [refundId]
    );

    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
