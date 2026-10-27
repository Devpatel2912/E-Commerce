import pool from "../config/db.js";

const createCategory = async ({ name, description }) => {
    const query = `
    INSERT INTO categories (name, description)
    VALUES ($1, $2)
    RETURNING id, name, description, created_at, updated_at
  `;

    const { rows } = await pool.query(query, [
        name.trim(),
        description ?? null,
    ]);

    return rows[0];
};

const getAllCategories = async () => {
    const { rows } = await pool.query(`
    SELECT id, name, description, created_at, updated_at
    FROM categories
    ORDER BY id DESC
  `);

    return rows;
};

const getCategoryById = async (id) => {
    const { rows } = await pool.query(
        `SELECT id, name, description, created_at, updated_at
     FROM categories
     WHERE id = $1`,
        [id],
    );

    return rows[0] ?? null;
};

const updateCategory = async (id, fields) => {
    const updates = [];
    const values = [];
    let index = 1;

    if (fields.name !== undefined) {
        updates.push(`name = $${index++}`);
        values.push(fields.name.trim());
    }

    if (fields.description !== undefined) {
        updates.push(`description = $${index++}`);
        values.push(fields.description);
    }

    updates.push("updated_at = NOW()");
    values.push(id);

    const { rows } = await pool.query(
        `UPDATE categories
     SET ${updates.join(", ")}
     WHERE id = $${index}
     RETURNING id, name, description, created_at, updated_at`,
        values,
    );

    return rows[0] ?? null;
};

const deleteCategory = async (id) => {
    const { rows } = await pool.query(
        `DELETE FROM categories
     WHERE id = $1
     RETURNING id, name, description`,
        [id],
    );

    return rows[0] ?? null;
};

export {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
};
