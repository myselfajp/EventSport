import express from 'express';
const router = express.Router();
import * as adminController from '../controllers/adminController.js';

router.get('/panel', adminController.getAdminPanel);

export default router;

