import pool from "../config/db.js";
import { LISTING_STATUS } from "../constants/status.constants.js";

export const createListing = async (data) => {
    const {
        user_id,
        category_id,
        title,
        description,
        price,
        condition,
        location,
        status = LISTING_STATUS.PENDING,
    } = data;

    const query = `
    INSERT INTO listings
      (user_id, category_id, title, description, price, condition, location, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

    const { rows } = await pool.query(query, [
        user_id,
        category_id,
        title,
        description ?? null,
        price,
        condition,
        location,
        status,
    ]);

    return rows[0];
};

export const getAllListings = async () => {
    const query = `
    SELECT
      l.*,
      c.name AS category_name
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    WHERE l.status = $1
    ORDER BY l.created_at DESC;
  `;

    const { rows } = await pool.query(query, [LISTING_STATUS.ACTIVE]);
    return rows;
};

export const getListingById = async (listing_id) => {
    const query = `
    SELECT
      l.*,
      c.name AS category_name
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    WHERE l.listing_id = $1;
  `;

    const { rows } = await pool.query(query, [listing_id]);
    return rows[0] ?? null;
};

export const updateListing = async (listing_id, user_id, data) => {
    const allowedFields = [
        "category_id",
        "title",
        "description",
        "price",
        "condition",
        "location",
        "status",
    ];

    const fields = [];
    const values = [];
    let index = 1;

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            fields.push(`${field} = $${index++}`);
            values.push(data[field]);
        }
    }

    if (fields.length === 0) {
        return null;
    }

    fields.push("updated_at = NOW()");
    values.push(listing_id, user_id);

    const query = `
    UPDATE listings
    SET ${fields.join(", ")}
    WHERE listing_id = $${index++}
      AND user_id = $${index}
    RETURNING *;
  `;

    const { rows } = await pool.query(query, values);
    return rows[0] ?? null;
};

export const updateListingStatus = async (listing_id, status) => {
    const query = `
    UPDATE listings
    SET status = $1, updated_at = NOW()
    WHERE listing_id = $2
    RETURNING *;
  `;

    const { rows } = await pool.query(query, [status, listing_id]);
    return rows[0] ?? null;
};

export const deleteListing = async (listing_id, user_id) => {
    const query = `
    DELETE FROM listings
    WHERE listing_id = $1 AND user_id = $2
    RETURNING *;
  `;

    const { rows } = await pool.query(query, [listing_id, user_id]);
    return rows[0] ?? null;
};
