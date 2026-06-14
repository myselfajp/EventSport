import express from 'express';
import * as locationController from '../controllers/locationController.js';

const router = express.Router();

router.get('/detect', locationController.detectLocation);
router.get('/countries', locationController.getCountries);
router.get('/tr/provinces', locationController.getTurkeyProvinces);
router.get('/tr/districts', locationController.getTurkeyDistricts);
router.get('/us/states', locationController.getUsStates);
router.get('/us/cities', locationController.getUsCities);
router.post('/districts', locationController.getIstanbulDistricts);

export default router;
