const parsePositiveId = (value) => {
  if (!/^[1-9]\d*$/.test(String(value ?? ""))) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
};

export const validateSendMessage = (req, res, next) => {
  const { receiver_id, content } = req.body;

  const receiverId = parsePositiveId(receiver_id);

  if (!receiverId) {
    return res.status(400).json({
      success: false,
      message: "receiver_id must be a valid positive integer.",
    });
  }

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message content is required.",
    });
  }

  if (content.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Message cannot exceed 5000 characters.",
    });
  }

  const senderId = req.user?.user_id ?? req.user?.id;

  if (String(senderId) === String(receiverId)) {
    return res.status(400).json({
      success: false,
      message: "You cannot send a message to yourself.",
    });
  }

  req.validatedMessage = {
    receiver_id: receiverId,
    content: content.trim(),
  };

  next();
};

export const validateUserId = (req, res, next) => {
  const userId = parsePositiveId(req.params.userId);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID.",
    });
  }

  req.validatedUserId = userId;
  next();
};

export const validateMessageId = (req, res, next) => {
  const messageId = parsePositiveId(req.params.messageId);

  if (!messageId) {
    return res.status(400).json({
      success: false,
      message: "Invalid message ID.",
    });
  }

  req.validatedMessageId = messageId;
  next();
};
