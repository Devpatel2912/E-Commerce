import pool from "../config/db.js";

export const createSearchHistory = async ({
    userId,
    keyword,
    categoryId = null,
    minPrice = null,
    maxPrice = null,
}) => {
    const query = `
    INSERT INTO search_history
      (user_id, keyword, category_id, min_price, max_price)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      search_id,
      user_id,
      keyword,
      category_id,
      min_price,
      max_price,
      created_at;
  `;

    const { rows } = await pool.query(query, [
        userId,
        keyword,
        categoryId,
        minPrice,
        maxPrice,
    ]);

    return rows[0];
};

export const getSearchHistoryByUserId = async (userId) => {
    const query = `
    SELECT
      sh.search_id,
      sh.user_id,
      sh.keyword,
      sh.category_id,
      c.name AS category_name,
      sh.min_price,
      sh.max_price,
      sh.created_at
    FROM search_history sh
    LEFT JOIN categories c ON c.id = sh.category_id
    WHERE sh.user_id = $1
    ORDER BY sh.created_at DESC, sh.search_id DESC;
  `;

    const { rows } = await pool.query(query, [userId]);
    return rows;
};

export const getSearchHistoryByIdAndUserId = async (searchId, userId) => {
    const query = `
    SELECT
      sh.search_id,
      sh.user_id,
      sh.keyword,
      sh.category_id,
      c.name AS category_name,
      sh.min_price,
      sh.max_price,
      sh.created_at
    FROM search_history sh
    LEFT JOIN categories c ON c.id = sh.category_id
    WHERE sh.search_id = $1 AND sh.user_id = $2
    LIMIT 1;
  `;

    const { rows } = await pool.query(query, [searchId, userId]);
    return rows[0] ?? null;
};

export const deleteSearchHistoryByIdAndUserId = async (searchId, userId) => {
    const query = `
    DELETE FROM search_history
    WHERE search_id = $1 AND user_id = $2
    RETURNING
      search_id,
      user_id,
      keyword,
      category_id,
      min_price,
      max_price,
      created_at;
  `;

    const { rows } = await pool.query(query, [searchId, userId]);
    return rows[0] ?? null;
};

export const clearSearchHistoryByUserId = async (userId) => {
    const query = `
    DELETE FROM search_history
    WHERE user_id = $1;
  `;

    const result = await pool.query(query, [userId]);
    return result.rowCount ?? 0;
};
