import mongoose from 'mongoose';
import StaticPage from '../models/staticPageModel.js';
import Suggestion from '../models/suggestionModel.js';
import DashboardHeroSlide from '../models/dashboardHeroSlideModel.js';
import DashboardHeroClick from '../models/dashboardHeroClickModel.js';
import * as zodValidation from '../utils/validation.js';
import { AppError } from '../utils/appError.js';
import { uploadsRelativePath } from '../utils/eventEndPhotoHelper.js';
import { resolveHeroCtaRedirect } from '../utils/heroCtaHref.js';

/** Slug: lowercase letters, digits, hyphens only (matches StaticPage.name usage). */
const PUBLIC_PAGE_NAME_RE = /^[a-z0-9-]{1,80}$/;

export const getPublicStaticPageByName = async (req, res, next) => {
    try {
        const raw = String(req.params.name ?? '').trim().toLowerCase();
        if (!PUBLIC_PAGE_NAME_RE.test(raw)) {
            throw new AppError(400, 'Invalid page name');
        }

        const page = await StaticPage.findOne({ name: raw, isActive: true })
            .select('name title content')
            .lean();

        if (!page) {
            throw new AppError(404, 'Page not found or inactive');
        }

        res.status(200).json({
            success: true,
            data: page,
        });
    } catch (err) {
        next(err);
    }
};

/** Active home dashboard hero slides (public read). */
export const getPublicDashboardHeroSlides = async (req, res, next) => {
    try {
        const slides = await DashboardHeroSlide.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 })
            .select(
                'badgeLabel title subtitle image imageAlt ctaLabel ctaHref ctaRequiresAdminRole order'
            )
            .lean();

        const data = slides.map((row) => ({
            _id: row._id,
            badgeLabel: row.badgeLabel || '',
            title: row.title || '',
            subtitle: row.subtitle || '',
            imageAlt: row.imageAlt || '',
            image: row.image?.path
                ? {
                      path: uploadsRelativePath(row.image.path),
                      mimeType: row.image.mimeType,
                  }
                : undefined,
            ctaLabel: row.ctaLabel || '',
            ctaHref: row.ctaHref || '',
            ctaRequiresAdminRole: !!row.ctaRequiresAdminRole,
            order: row.order ?? 0,
        }));

        res.status(200).json({
            success: true,
            data,
        });
    } catch (err) {
        next(err);
    }
};

/** Count click and redirect to slide destination (internal or external). */
export const trackHeroSlideClick = async (req, res, next) => {
    try {
        const slideId = String(req.params.slideId ?? '').trim();
        if (!mongoose.Types.ObjectId.isValid(slideId)) {
            throw new AppError(400, 'Invalid slide id');
        }

        const slide = await DashboardHeroSlide.findOneAndUpdate(
            {
                _id: slideId,
                isActive: true,
                ctaHref: { $exists: true, $nin: ['', null] },
            },
            {
                $inc: { clickCount: 1 },
                $set: { lastClickedAt: new Date() },
            },
            { new: true }
        )
            .select('ctaHref')
            .lean();

        if (!slide?.ctaHref?.trim()) {
            throw new AppError(404, 'Slide not found or link not configured');
        }

        const destination = resolveHeroCtaRedirect(slide.ctaHref, req);
        if (!destination) {
            throw new AppError(400, 'Invalid destination link');
        }

        const userId =
            req.user?._id && mongoose.Types.ObjectId.isValid(String(req.user._id))
                ? req.user._id
                : null;

        DashboardHeroClick.create({
            slideId,
            clickedAt: new Date(),
            userId,
        }).catch((err) => {
            console.error('Failed to log hero click:', err?.message || err);
        });

        res.redirect(302, destination);
    } catch (err) {
        next(err);
    }
};

export const submitSuggestion = async (req, res, next) => {
    try {
        const raw = req.body ?? {};
        const emailTrimmed =
            typeof raw.email === 'string' && raw.email.trim().length > 0 ? raw.email.trim() : undefined;
        const contactNameTrimmed =
            typeof raw.contactName === 'string' && raw.contactName.trim().length > 0
                ? raw.contactName.trim()
                : undefined;

        const parsed = zodValidation.suggestionSubmitSchema.parse({
            message: raw.message,
            email: emailTrimmed,
            contactName: contactNameTrimmed,
        });

        await Suggestion.create({
            message: parsed.message,
            email: parsed.email,
            contactName: parsed.contactName,
        });

        res.status(201).json({
            success: true,
            message: 'Öneriniz alındı. Teşekkür ederiz.',
        });
    } catch (err) {
        next(err);
    }
};
