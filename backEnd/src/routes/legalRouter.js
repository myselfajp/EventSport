import express from 'express';
import * as legalController from '../controllers/legalController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/active', legalController.getActive);
router.get('/catalog', legalController.getActiveCatalog);
router.post('/accept', authMiddleware, legalController.acceptDocument);

export default router;
