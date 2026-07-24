import express from 'express';
import * as messageController from '../controllers/messageController.js';

const router = express.Router();

// All routes are mounted behind authMiddleware in app.js.
router.get('/conversations', messageController.getConversations);
router.get('/conversations/:conversationId', messageController.getMessages);
router.post('/conversations', messageController.createConversation);
router.delete('/conversations/:conversationId', messageController.deleteConversation);
router.delete(
    '/conversations/:conversationId/messages/:messageId',
    messageController.deleteMessage
);

export default router;
