CREATE TABLE IF NOT EXISTS messages (
  message_id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_id
  ON messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(sender_id, receiver_id, created_at DESC);
