import pool from "../config/db.js";

export const findUserById = async (userId) => {
  const result = await pool.query(
    `SELECT id
         FROM users
         WHERE id = $1`,
    [userId],
  );

  return result.rows[0] ?? null;
};

export const createMessage = async ({ senderId, receiverId, content }) => {
  const result = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, content)
         VALUES ($1, $2, $3)
         RETURNING message_id, sender_id, receiver_id,
                   content, is_read, created_at`,
    [senderId, receiverId, content],
  );

  return result.rows[0];
};

export const getConversations = async (userId) => {
  const result = await pool.query(
    `SELECT DISTINCT ON (
                    CASE
                        WHEN sender_id = $1 THEN receiver_id
                        ELSE sender_id
                    END
                )
                message_id,
                sender_id,
                receiver_id,
                content,
                is_read,
                created_at,
                CASE
                    WHEN sender_id = $1 THEN receiver_id
                    ELSE sender_id
                END AS other_user_id
         FROM messages
         WHERE sender_id = $1 OR receiver_id = $1
         ORDER BY
            CASE
                WHEN sender_id = $1 THEN receiver_id
                ELSE sender_id
            END,
            created_at DESC,
            message_id DESC`,
    [userId],
  );

  return result.rows;
};

export const getConversationMessages = async (
  currentUserId,
  otherUserId,
  limit = 50,
  offset = 0,
) => {
  const result = await pool.query(
    `SELECT message_id, sender_id, receiver_id,
                content, is_read, created_at
         FROM messages
         WHERE (
             (sender_id = $1 AND receiver_id = $2)
             OR
             (sender_id = $2 AND receiver_id = $1)
         )
         ORDER BY created_at DESC, message_id DESC
         LIMIT $3 OFFSET $4`,
    [currentUserId, otherUserId, limit, offset],
  );

  return result.rows;
};

export const markMessageAsRead = async (messageId, receiverId) => {
  const result = await pool.query(
    `UPDATE messages
         SET is_read = TRUE
         WHERE message_id = $1
           AND receiver_id = $2
         RETURNING message_id, sender_id, receiver_id,
                   content, is_read, created_at`,
    [messageId, receiverId],
  );

  return result.rows[0] ?? null;
};

export const deleteMessage = async (messageId, senderId) => {
  const result = await pool.query(
    `DELETE FROM messages
         WHERE message_id = $1
           AND sender_id = $2
         RETURNING message_id`,
    [messageId, senderId],
  );

  return result.rows[0] ?? null;
};
