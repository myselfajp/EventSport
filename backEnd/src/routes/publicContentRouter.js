import express from 'express';
import * as publicContentController from '../controllers/publicContentController.js';
import * as blogController from '../controllers/blogController.js';
import * as newsController from '../controllers/newsController.js';
import { validateCSRFToken } from '../middleware/csrfProtection.js';
import {
    heroClickRateLimiter,
    publicSuggestionRateLimiter,
} from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/public/contracts', publicContentController.getPublicContractsCatalog);
router.get(
    '/public/static-pages/active',
    publicContentController.getPublicActiveStaticPages
);
router.get('/public/static-page/:name', publicContentController.getPublicStaticPageByName);
router.get('/public/dashboard-header-logo', publicContentController.getPublicDashboardHeaderLogo);
router.get('/public/dashboard-hero-slides', publicContentController.getPublicDashboardHeroSlides);
router.get('/public/sport-groups', publicContentController.getPublicSportGroups);
router.get('/public/sports', publicContentController.getPublicSports);
router.get('/public/blogs', blogController.listPublicBlogs);
router.get('/public/blogs/:slug', blogController.getPublicBlogBySlug);
router.get('/public/news', newsController.listPublicNews);
router.get('/public/news/:slug', newsController.getPublicNewsBySlug);
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
