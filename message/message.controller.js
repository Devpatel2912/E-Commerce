import {
    sendMessageService,
    listConversationsService,
    listConversationMessagesService,
    readMessageService,
    removeMessageService,
} from "./message.service.js";

const getAuthenticatedUserId = (req) => req.user?.user_id ?? req.user?.id;

const MessageController = {
    sendMessage: async (req, res, next) => {
        try {
            const senderId = getAuthenticatedUserId(req);
            const { receiver_id, content } = req.validatedMessage;

            const message = await sendMessageService({
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
    },

    listConversations: async (req, res, next) => {
        try {
            const userId = getAuthenticatedUserId(req);
            const conversations = await listConversationsService(userId);

            return res.status(200).json({
                success: true,
                message: "Conversations retrieved successfully.",
                data: conversations,
            });
        } catch (error) {
            next(error);
        }
    },

    listConversationMessages: async (req, res, next) => {
        try {
            const currentUserId = getAuthenticatedUserId(req);
            const otherUserId = req.validatedUserId;
            const { limit, offset } = req.query;

            const { messages, pagination } =
                await listConversationMessagesService({
                    currentUserId,
                    otherUserId,
                    limit,
                    offset,
                });

            return res.status(200).json({
                success: true,
                message: "Messages retrieved successfully.",
                pagination,
                data: messages,
            });
        } catch (error) {
            next(error);
        }
    },

    readMessage: async (req, res, next) => {
        try {
            const receiverId = getAuthenticatedUserId(req);
            const message = await readMessageService({
                messageId: req.validatedMessageId,
                receiverId,
            });

            return res.status(200).json({
                success: true,
                message: "Message marked as read.",
                data: message,
            });
        } catch (error) {
            next(error);
        }
    },

    removeMessage: async (req, res, next) => {
        try {
            const senderId = getAuthenticatedUserId(req);
            const deleted = await removeMessageService({
                messageId: req.validatedMessageId,
                senderId,
            });

            return res.status(200).json({
                success: true,
                message: "Message deleted successfully.",
                data: deleted,
            });
        } catch (error) {
            next(error);
        }
    },
};

export const {
    sendMessage,
    listConversations,
    listConversationMessages,
    readMessage,
    removeMessage,
} = MessageController;

export default MessageController;
