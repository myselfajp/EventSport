import express from 'express';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
import * as companyController from '../controllers/companyController.js';

const router = express.Router();

router.post(
    '/create-company',
    uploadFile({ fieldName: 'company-photo', optional: true }),
    companyController.createCompany
);
router.put(
    '/:companyId',
    uploadFile({ fieldName: 'company-photo', optional: true }),
    companyController.editCompany
);
router.delete('/:companyId', companyController.deleteCompany);

// router.get('/:companyId', companyController.getCompany);
// router.get('/', companyController.getAllCompanies);

export default router;
