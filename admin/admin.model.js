import pool from "../config/db.js";

export const getAdminUsers = async ({
    limit = 10,
    offset = 0,
    search = null,
    role = null,
}) => {
    const conditions = [];
    const params = [];

    if (search) {
        params.push(`%${search.trim()}%`);
        conditions.push(
            `(name ILIKE $${params.length} OR email ILIKE $${params.length})`,
        );
    }

    if (role) {
        params.push(role.trim().toLowerCase());
        conditions.push(`role = $${params.length}`);
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const dataQuery = `
    SELECT
      id,
      name,
      email,
      role,
      created_at,
      updated_at,
      COUNT(*) OVER() AS total_count
    FROM users
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

    const { rows } = await pool.query(dataQuery, params);
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

    const users = rows.map((row) => {
        const user = { ...row };
        delete user.total_count;
        return user;
    });

    return { users, total };
};

export const getAdminUserById = async (userId) => {
    const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at,
      u.updated_at,
      (SELECT COUNT(*)::INTEGER FROM listings l WHERE l.user_id = u.id) AS total_listings,
      (SELECT COUNT(*)::INTEGER FROM payments p WHERE p.user_id = u.id) AS total_payments,
      (SELECT COALESCE(SUM(p.amount), 0)::NUMERIC(12,2)
       FROM payments p
       WHERE p.user_id = u.id AND LOWER(p.status) IN ('completed', 'succeeded', 'paid')) AS total_spent,
      (SELECT COUNT(*)::INTEGER
       FROM refunds r
       INNER JOIN payments p2 ON p2.id = r.payment_id
       WHERE p2.user_id = u.id) AS total_refunds
    FROM users u
    WHERE u.id = $1
    LIMIT 1
  `;

    const { rows } = await pool.query(query, [userId]);
    return rows[0] ?? null;
};

export const updateAdminUser = async (userId, { name, email, role }) => {
    const query = `
    UPDATE users
    SET
      name = COALESCE($2, name),
      email = COALESCE($3, email),
      role = COALESCE($4, role),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, name, email, role, created_at, updated_at
  `;

    const { rows } = await pool.query(query, [
        userId,
        name ?? null,
        email ?? null,
        role ?? null,
    ]);

    return rows[0] ?? null;
};

export const deleteAdminUser = async (userId) => {
    const query = `
    DELETE FROM users
    WHERE id = $1
    RETURNING id, name, email, role
  `;

    const { rows } = await pool.query(query, [userId]);
    return rows[0] ?? null;
};

export const getAdminRefunds = async ({
    status = null,
    userId = null,
    limit = 10,
    offset = 0,
}) => {
    const conditions = [];
    const params = [];

    if (status) {
        params.push(status.trim().toLowerCase());
        conditions.push(`LOWER(r.status) = $${params.length}`);
    }

    if (userId) {
        params.push(userId);
        conditions.push(`p.user_id = $${params.length}`);
    }

    const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const query = `
    SELECT
      r.id AS refund_id,
      r.payment_id,
      r.amount AS refund_amount,
      r.reason,
      r.status AS refund_status,
      r.provider_refund_id,
      r.created_at,
      r.updated_at,
      p.user_id,
      u.name AS user_name,
      u.email AS user_email,
      p.amount AS payment_amount,
      p.status AS payment_status,
      p.listing_id,
      COUNT(*) OVER() AS total_count
    FROM refunds r
    INNER JOIN payments p ON p.id = r.payment_id
    INNER JOIN users u ON u.id = p.user_id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

    const { rows } = await pool.query(query, params);
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const refunds = rows.map((row) => {
        const item = { ...row };
        delete item.total_count;
        return item;
    });

    return { refunds, total };
};

export const getAdminRefundById = async (refundId) => {
    const query = `
    SELECT
      r.id AS refund_id,
      r.payment_id,
      r.amount AS refund_amount,
      r.reason,
      r.status AS refund_status,
      r.provider_refund_id,
      r.created_at,
      r.updated_at,
      p.user_id,
      u.name AS user_name,
      u.email AS user_email,
      p.amount AS payment_amount,
      p.currency AS payment_currency,
      p.provider AS payment_provider,
      p.status AS payment_status,
      p.listing_id
    FROM refunds r
    INNER JOIN payments p ON p.id = r.payment_id
    INNER JOIN users u ON u.id = p.user_id
    WHERE r.id = $1
    LIMIT 1
  `;

    const { rows } = await pool.query(query, [refundId]);
    return rows[0] ?? null;
};

export const createAdminRefund = async ({
    paymentId,
    amount,
    reason = "Refund issued by administrator",
    status = "completed",
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const paymentResult = await client.query(
            `SELECT id, user_id, amount, currency, status
       FROM payments
       WHERE id = $1
       FOR UPDATE`,
            [paymentId],
        );

        if (paymentResult.rowCount === 0) {
            const error = new Error("Payment not found.");
            error.statusCode = 404;
            throw error;
        }

        const payment = paymentResult.rows[0];

        const existingResult = await client.query(
            `SELECT COALESCE(SUM(amount), 0) AS total_refunded
       FROM refunds
       WHERE payment_id = $1
         AND LOWER(status) IN ('requested', 'pending', 'processing', 'completed', 'succeeded')`,
            [paymentId],
        );

        const alreadyRefunded = Number(existingResult.rows[0].total_refunded);
        const paymentAmount = Number(payment.amount);
        const requestedAmount = Number(amount);

        if (requestedAmount + alreadyRefunded > paymentAmount) {
            const error = new Error(
                `Refund amount exceeds eligible remaining balance (${(
                    paymentAmount - alreadyRefunded
                ).toFixed(2)} remaining).`,
            );
            error.statusCode = 409;
            throw error;
        }

        const refundResult = await client.query(
            `INSERT INTO refunds (payment_id, amount, reason, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [paymentId, requestedAmount, reason, status],
        );

        const refund = refundResult.rows[0];

        if (status === "completed" || status === "succeeded") {
            await client.query(
                `UPDATE payments
         SET status = 'refunded', updated_at = NOW()
         WHERE id = $1`,
                [paymentId],
            );

            await client.query(
                `INSERT INTO transactions
           (payment_id, transaction_type, amount, currency, status)
         VALUES ($1, 'refund', $2, $3, 'completed')`,
                [paymentId, requestedAmount, payment.currency || "INR"],
            );
        }

        await client.query("COMMIT");
        return refund;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const updateAdminRefundStatus = async (
    refundId,
    { status, reason, providerRefundId },
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const refundResult = await client.query(
            `SELECT r.id, r.payment_id, r.amount, r.status, p.currency
       FROM refunds r
       INNER JOIN payments p ON p.id = r.payment_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
            [refundId],
        );

        if (refundResult.rowCount === 0) {
            const error = new Error("Refund record not found.");
            error.statusCode = 404;
            throw error;
        }

        const currentRefund = refundResult.rows[0];

        const updated = await client.query(
            `UPDATE refunds
       SET
         status = $2,
         reason = COALESCE($3, reason),
         provider_refund_id = COALESCE($4, provider_refund_id),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
            [refundId, status, reason ?? null, providerRefundId ?? null],
        );

        if (
            (status === "completed" || status === "succeeded") &&
            currentRefund.status !== "completed" &&
            currentRefund.status !== "succeeded"
        ) {
            await client.query(
                `UPDATE payments
         SET status = 'refunded', updated_at = NOW()
         WHERE id = $1`,
                [currentRefund.payment_id],
            );

            await client.query(
                `INSERT INTO transactions
           (payment_id, transaction_type, amount, currency, status)
         VALUES ($1, 'refund', $2, $3, 'completed')`,
                [
                    currentRefund.payment_id,
                    currentRefund.amount,
                    currentRefund.currency || "INR",
                ],
            );
        }

        await client.query("COMMIT");
        return updated.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
