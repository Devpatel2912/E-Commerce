import pool from "../config/db.js";

export const findUserByEmail = async (email) => {
    const query = `
        SELECT id, name, email, password_hash, created_at, updated_at
        FROM users
        WHERE email=$1
        LIMIT 1
    `;

    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
};

export const findUserById = async (id) => {
    const query = `
    SELECT id, name, email, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};

export const createUser = async ({ name, email, passwordHash }) => {
    const query = `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, created_at, updated_at
  `;

    const { rows } = await pool.query(query, [name, email, passwordHash]);

    return rows[0];
};

export const findUsers = async (limit = 10, offset = 0) => {
    const query = `
    SELECT id, name, email, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

    const { rows } = await pool.query(query, [limit, offset]);
    return rows;
};

export const updateUser = async (id, { name, email }) => {
    const query = `
    UPDATE users
    SET
      name = COALESCE($2, name),
      email = COALESCE($3, email),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, name, email, created_at, updated_at
  `;

    const result = await pool.query(query, [id, name ?? null, email ?? null]);

    return result.rows[0] || null;
};

export const deleteUser = async (id) => {
    const query = `
  DELETE FROM users
  WHERE id = $1
  RETURNING id
  `;

    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
};
