import {
  findUserById,
  createMessage,
  getConversations,
  getConversationMessages,
  markMessageAsRead,
  deleteMessage,
} from "./message.model.js";

const getAuthenticatedUserId = (req) => req.user?.user_id ?? req.user?.id;

export const sendMessage = async (req, res, next) => {
  try {
    const senderId = getAuthenticatedUserId(req);
    const { receiver_id, content } = req.validatedMessage;

    const receiver = await findUserById(receiver_id);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    const message = await createMessage({
      senderId,
      receiverId: receiver_id,
      content,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

export const listConversations = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const conversations = await getConversations(userId);

    return res.status(200).json({
      success: true,
      message: "Conversations retrieved successfully.",
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const listConversationMessages = async (req, res, next) => {
  try {
    const currentUserId = getAuthenticatedUserId(req);
    const otherUserId = req.validatedUserId;

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 50, 1),
      100,
    );

    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    if (String(currentUserId) === String(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot open a conversation with yourself.",
      });
    }

    const otherUser = await findUserById(otherUserId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const messages = await getConversationMessages(
      currentUserId,
      otherUserId,
      limit,
      offset,
    );

    return res.status(200).json({
      success: true,
      message: "Messages retrieved successfully.",
      pagination: {
        limit,
        offset,
        count: messages.length,
      },
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

export const readMessage = async (req, res, next) => {
  try {
    const receiverId = getAuthenticatedUserId(req);
    const message = await markMessageAsRead(req.validatedMessageId, receiverId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found or you are not its receiver.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message marked as read.",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMessage = async (req, res, next) => {
  try {
    const senderId = getAuthenticatedUserId(req);

    const deleted = await deleteMessage(req.validatedMessageId, senderId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Message not found or you are not its sender.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};
