import express from 'express';
import * as serviceRequestController from '../controllers/serviceRequestController.js';

const router = express.Router();

router.get('/questions', serviceRequestController.getQuestionCatalog);
router.get('/mine', serviceRequestController.listMyRequests);
router.get('/incoming', serviceRequestController.listIncomingRequests);
router.post('/', serviceRequestController.createServiceRequest);
router.post('/:requestId/respond', serviceRequestController.respondToRequest);
router.post(
    '/:requestId/responses/:responseId/select',
    serviceRequestController.selectResponse
);

export default router;
