import express from 'express';
import * as publicContentController from '../controllers/publicContentController.js';
import * as subscriptionPlanController from '../controllers/subscriptionPlanController.js';
import * as blogController from '../controllers/blogController.js';
import * as newsController from '../controllers/newsController.js';
import * as videoController from '../controllers/videoController.js';
import { validateCSRFToken } from '../middleware/csrfProtection.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
    heroClickRateLimiter,
    publicSuggestionRateLimiter,
    welcomePageSubscribeRateLimiter,
} from '../middleware/rateLimiter.js';
import * as welcomePageController from '../controllers/welcomePageController.js';

const router = express.Router();

router.get('/public/contracts', publicContentController.getPublicContractsCatalog);
router.get('/public/subscription-plans', subscriptionPlanController.listPublicPlans);
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
router.get('/public/videos', videoController.listPublicVideos);
router.get('/public/videos/:slug', videoController.getPublicVideoBySlug);
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
router.get('/public/welcome-page', welcomePageController.getPublicWelcomePage);
router.post(
    '/public/welcome-page/subscribe',
    validateCSRFToken,
    authMiddleware,
    welcomePageSubscribeRateLimiter,
    welcomePageController.subscribeWelcomePage
);

export default router;
