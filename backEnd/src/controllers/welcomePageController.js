import { AppError } from '../utils/appError.js';
import WelcomePageSettings from '../models/welcomePageSettingsModel.js';
import WelcomePageLead from '../models/welcomePageLeadModel.js';
import * as zodValidation from '../utils/validation.js';
import {
    clientMetaFromRequest,
    recordLegalAcceptance,
    recordMarketingConsent,
} from '../utils/contractAcceptanceHelper.js';

const SETTINGS_KEY = 'default';

async function getOrCreateSettingsDoc() {
    let doc = await WelcomePageSettings.findOne({ key: SETTINGS_KEY });
    if (!doc) {
        doc = await WelcomePageSettings.create({ key: SETTINGS_KEY });
    }
    return doc;
}

function parseWelcomePageSettingsBody(req) {
    if (req.body?.data) {
        try {
            return typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
        } catch {
            throw new AppError(400, 'Invalid welcome page settings payload.');
        }
    }
    return req.body ?? {};
}

function serializeSettings(doc) {
    const row = doc?.toObject ? doc.toObject() : doc;
    return row;
}

export const getPublicWelcomePage = async (_req, res, next) => {
    try {
        const settings = await WelcomePageSettings.findOne({ key: SETTINGS_KEY }).lean();
        if (!settings?.isActive) {
            return res.status(200).json({ success: true, data: null });
        }

        res.status(200).json({
            success: true,
            data: {
                headline: settings.headline,
                subheadline: settings.subheadline,
                emailPrompt: settings.emailPrompt,
                ctaSubmitLabel: settings.ctaSubmitLabel,
                ctaSkipLabel: settings.ctaSkipLabel,
                image: settings.image,
                imageAlt: settings.imageAlt,
                socialLinks: (settings.socialLinks || []).filter((link) => link?.url?.trim()),
            },
        });
    } catch (err) {
        next(err);
    }
};

export const subscribeWelcomePage = async (req, res, next) => {
    try {
        const settings = await WelcomePageSettings.findOne({ key: SETTINGS_KEY }).lean();
        if (!settings?.isActive) {
            throw new AppError(404, 'Welcome page is not active.');
        }

        const body = zodValidation.welcomePageSubscribeSchema.parse(req.body ?? {});
        const meta = clientMetaFromRequest(req);
        const userId = req.user?._id || null;

        const existing = await WelcomePageLead.findOne({
            email: body.email.toLowerCase(),
        }).lean();
        if (existing) {
            return res.status(200).json({
                success: true,
                message: 'You are already on our list. Welcome to EventSport!',
                alreadySubscribed: true,
            });
        }

        await recordLegalAcceptance(req, userId, {
            versionId: body.kvkkVersionId,
            expectedDocType: 'kvkk',
            context: 'welcome_page',
        });

        if (body.marketingConsent && body.commercialMessagesVersionId) {
            await recordLegalAcceptance(req, userId, {
                versionId: body.commercialMessagesVersionId,
                expectedDocType: 'commercial_messages',
                context: 'welcome_page',
            });
        } else if (body.marketingConsent) {
            await recordMarketingConsent(req, userId, true, 'welcome_page');
        }

        await WelcomePageLead.create({
            email: body.email.toLowerCase(),
            visitorKey: body.visitorKey || null,
            user: userId,
            kvkkConsent: true,
            marketingConsent: Boolean(body.marketingConsent),
            ...meta,
        });

        res.status(201).json({
            success: true,
            message: 'Thanks for joining! Explore EventSport and find your next event.',
        });
    } catch (err) {
        next(err);
    }
};

export const getAdminWelcomePageSettings = async (_req, res, next) => {
    try {
        const settings = await getOrCreateSettingsDoc();
        res.status(200).json({ success: true, data: serializeSettings(settings) });
    } catch (err) {
        next(err);
    }
};

export const updateAdminWelcomePageSettings = async (req, res, next) => {
    try {
        const settings = await getOrCreateSettingsDoc();
        const raw = parseWelcomePageSettingsBody(req);
        const payload = zodValidation.welcomePageSettingsSchema.parse(raw);

        if (req.fileMeta?.['welcome-page-image']) {
            const imageData = Array.isArray(req.fileMeta['welcome-page-image'])
                ? req.fileMeta['welcome-page-image'][0]
                : req.fileMeta['welcome-page-image'];
            settings.image = imageData;
        }

        Object.assign(settings, payload);
        if (req.user?._id) {
            settings.updatedBy = req.user._id;
        }

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Welcome page updated.',
            data: serializeSettings(settings),
        });
    } catch (err) {
        next(err);
    }
};

export const listAdminWelcomePageLeads = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const skip = (page - 1) * limit;

        const [rows, total] = await Promise.all([
            WelcomePageLead.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'firstName lastName email')
                .lean(),
            WelcomePageLead.countDocuments(),
        ]);

        res.status(200).json({
            success: true,
            data: rows,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (err) {
        next(err);
    }
};
