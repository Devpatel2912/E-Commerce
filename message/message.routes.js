import { Router } from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";

import {
    sendMessage,
    listConversations,
    listConversationMessages,
    readMessage,
    removeMessage,
} from "./message.controller.js";

import {
    validateSendMessage,
    validateUserId,
    validateMessageId,
} from "./message.validation.js";

const router = Router();

router.use(authenticateToken);

router.post("/", validateSendMessage, sendMessage);

router.get("/conversations", listConversations);

router.get("/conversation/:userId", validateUserId, listConversationMessages);

router.patch("/:messageId/read", validateMessageId, readMessage);

router.delete("/:messageId", validateMessageId, removeMessage);

export default router;
