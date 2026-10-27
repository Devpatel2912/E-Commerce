import {
    findUserById,
    createMessage,
    getConversations,
    getConversationMessages,
    markMessageAsRead,
    deleteMessage,
} from "./message.model.js";
import ApiError from "../utils/ApiError.js";

export const sendMessageService = async ({ senderId, receiverId, content }) => {
    if (!senderId) {
        throw new ApiError(401, "Authentication required.");
    }

    const receiver = await findUserById(receiverId);
    if (!receiver) {
        throw new ApiError(404, "Receiver not found.");
    }

    const message = await createMessage({
        senderId,
        receiverId,
        content,
    });

    return message;
};

export const listConversationsService = async (userId) => {
    if (!userId) {
        throw new ApiError(401, "Authentication required.");
    }

    return await getConversations(userId);
};

export const listConversationMessagesService = async ({
    currentUserId,
    otherUserId,
    limit = 50,
    offset = 0,
}) => {
    if (!currentUserId) {
        throw new ApiError(401, "Authentication required.");
    }

    if (String(currentUserId) === String(otherUserId)) {
        throw new ApiError(
            400,
            "You cannot open a conversation with yourself.",
        );
    }

    const otherUser = await findUserById(otherUserId);
    if (!otherUser) {
        throw new ApiError(404, "User not found.");
    }

    const resolvedLimit = Math.min(
        Math.max(Number.parseInt(limit, 10) || 50, 1),
        100,
    );
    const resolvedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);

    const messages = await getConversationMessages(
        currentUserId,
        otherUserId,
        resolvedLimit,
        resolvedOffset,
    );

    return {
        messages,
        pagination: {
            limit: resolvedLimit,
            offset: resolvedOffset,
            count: messages.length,
        },
    };
};

export const readMessageService = async ({ messageId, receiverId }) => {
    if (!receiverId) {
        throw new ApiError(401, "Authentication required.");
    }

    const message = await markMessageAsRead(messageId, receiverId);
    if (!message) {
        throw new ApiError(
            404,
            "Message not found or you are not its receiver.",
        );
    }

    return message;
};

export const removeMessageService = async ({ messageId, senderId }) => {
    if (!senderId) {
        throw new ApiError(401, "Authentication required.");
    }

    const deleted = await deleteMessage(messageId, senderId);
    if (!deleted) {
        throw new ApiError(404, "Message not found or you are not its sender.");
    }

    return deleted;
};
