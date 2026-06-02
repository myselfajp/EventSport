import express from 'express';
import * as legalController from '../controllers/legalController.js';

const router = express.Router();

router.get('/active', legalController.getActive);
router.get('/catalog', legalController.getActiveCatalog);

export default router;
