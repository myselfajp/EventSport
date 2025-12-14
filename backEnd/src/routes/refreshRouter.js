import express from 'express';
const router = express.Router();
import { refreshToken } from '../controllers/authController.js';

router.post('/refresh', refreshToken);

export default router;
