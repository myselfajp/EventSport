import express from 'express';
import * as messageController from '../controllers/messageController.js';

const router = express.Router();

// Tüm route'lar app.js'te authMiddleware arkasında mount edilir.
router.get('/conversations', messageController.getConversations);
router.get('/conversations/:conversationId', messageController.getMessages);
router.post('/conversations', messageController.createConversation);

export default router;
