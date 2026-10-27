import pool from "../config/db.js";

export const saveRefreshToken = async ({ userId, tokenHash, expiresAt }) => {
  await pool.query(
    `INSERT INTO refresh_tokens
       (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
};

export const consumeRefreshToken = async (tokenHash) => {
  const { rows } = await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id`,
    [tokenHash],
  );

  return rows[0] || null;
};

export const revokeRefreshToken = async (tokenHash) => {
  await pool.query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1
       AND revoked_at IS NULL`,
    [tokenHash],
  );
};
