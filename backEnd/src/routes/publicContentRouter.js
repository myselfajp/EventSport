import express from 'express';
import * as publicContentController from '../controllers/publicContentController.js';
import { validateCSRFToken } from '../middleware/csrfProtection.js';
import {
    heroClickRateLimiter,
    publicSuggestionRateLimiter,
} from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/public/static-page/:name', publicContentController.getPublicStaticPageByName);
router.get('/public/dashboard-hero-slides', publicContentController.getPublicDashboardHeroSlides);
router.get(
    '/public/hero-click/:slideId',
    heroClickRateLimiter,
    publicContentController.trackHeroSlideClick
);
router.post(
    '/public/suggestion',
    validateCSRFToken,
    publicSuggestionRateLimiter,
    publicContentController.submitSuggestion
);

export default router;
