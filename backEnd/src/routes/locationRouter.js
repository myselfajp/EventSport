import express from 'express';
import * as locationController from '../controllers/locationController.js';

const router = express.Router();

router.post('/districts', locationController.getIstanbulDistricts);

export default router;
