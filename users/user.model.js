import bcrypt from 'bcrypt';
import pool from '../config/db.js';

export const findUserByEmail = async (email) => {
    const query = `
        SELECT id, name, email, role, password_hash, created_at, updated_at
        FROM users
        WHERE email=$1
        LIMIT 1
    `;

    const {rows} = await pool.query(query, [email]);
    return rows[0] || null;
};

export const findUserById = async (id) => {
    const query = `
    SELECT id, name, email, role, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `;

    const {rows} = await pool.query(query, [id]);
    return rows[0] || null;
};

export const createUser = async ({
  name,
  email,
  passwordHash,
  role = 'user',
}) => {
  const query = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at, updated_at
  `;

  const { rows } = await pool.query(query, [
    name,
    email,
    passwordHash,
    role,
  ]);

  return rows[0];
};

export const findUsers = async (limit = 10, offset = 0) => {
  const query = `
    SELECT id, name, email, role, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const { rows } = await pool.query(query, [limit, offset]);
  return rows;
};

export const updateUser = async (id, { name, email, role }) => {
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

  const result = await pool.query(query, [
    id,
    name ?? null,
    email ?? null,
    role ?? null,
  ]);

  return result.rows[0] || null;
};

export const deleteUser = async (id) => {
  const query= `
  DELETE FROM users
  WHERE id = $1
  RETURNING id
  `;

  const {rows} = await pool.query(query,[id]);
  return rows[0] || null;
};

export const seedAdminUser = async ({
  name = "Admin",
  email = "admin@gmail.com",
  password = "admin123",
  role = "admin",
} = {}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);
  const passwordHash = await bcrypt.hash(password, 12);

  if (existingUser) {
    const query = `
      UPDATE users
      SET name = $1, password_hash = $2, role = $3, updated_at = CURRENT_TIMESTAMP
      WHERE email = $4
      RETURNING id, name, email, role, created_at, updated_at
    `;
    const { rows } = await pool.query(query, [name, passwordHash, role, normalizedEmail]);
    return rows[0];
  }

  return await createUser({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
  });
};
