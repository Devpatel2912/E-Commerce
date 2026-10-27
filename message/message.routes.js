import { Router } from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";

import MessageController from "./message.controller.js";

import {
    validateSendMessage,
    validateUserId,
    validateMessageId,
} from "./message.validation.js";

const router = Router();

router.use(authenticateToken);

router.post("/", validateSendMessage, MessageController.sendMessage);

router.get("/conversations", MessageController.listConversations);

router.get(
    "/conversation/:userId",
    validateUserId,
    MessageController.listConversationMessages,
);

router.patch(
    "/:messageId/read",
    validateMessageId,
    MessageController.readMessage,
);

router.delete(
    "/:messageId",
    validateMessageId,
    MessageController.removeMessage,
);

export default router;
