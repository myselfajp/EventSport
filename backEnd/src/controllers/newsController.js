import { unlink } from 'fs/promises';
import { z } from 'zod';
import News from '../models/newsModel.js';
import { Sport, SportGroup } from '../models/referenceDataModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import { uploadsRelativePath } from '../utils/eventEndPhotoHelper.js';

const NEWS_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const newsPayloadSchema = z.object({
    title: z.string().trim().min(3).max(180),
    slug: z.string().trim().max(220).optional().default(''),
    excerpt: z.string().trim().min(10).max(320),
    content: z.string().trim().min(30).max(20000),
    sportGroup: mongoObjectId,
    sport: mongoObjectId,
    status: z.enum(['draft', 'published']).optional().default('published'),
    isActive: z.coerce.boolean().optional().default(true),
});

const newsUpdateSchema = newsPayloadSchema.partial().extend({
    removeCoverImage: z.coerce.boolean().optional().default(false),
});

const newsListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(12),
    search: z.string().trim().max(120).optional().default(''),
    sportGroup: mongoObjectId.optional(),
    sport: mongoObjectId.optional(),
    status: z.enum(['draft', 'published', 'all']).optional().default('published'),
});

function parseNewsData(req) {
    if (req.body?.data) {
        return JSON.parse(req.body.data);
    }
    return req.body || {};
}

function slugify(input) {
    const normalized = String(input || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0131/g, 'i')
        .replace(/\u0130/g, 'i')
        .replace(/\u011f/g, 'g')
        .replace(/\u011e/g, 'g')
        .replace(/\u00fc/g, 'u')
        .replace(/\u00dc/g, 'u')
        .replace(/\u015f/g, 's')
        .replace(/\u015e/g, 's')
        .replace(/\u00f6/g, 'o')
        .replace(/\u00d6/g, 'o')
        .replace(/\u00e7/g, 'c')
        .replace(/\u00c7/g, 'c')
        .replace(/i/g, 'i')
        .replace(/I/g, 'i')
        .replace(/g/g, 'g')
        .replace(/G/g, 'g')
        .replace(/u/g, 'u')
        .replace(/U/g, 'u')
        .replace(/s/g, 's')
        .replace(/S/g, 's')
        .replace(/o/g, 'o')
        .replace(/O/g, 'o')
        .replace(/c/g, 'c')
        .replace(/C/g, 'c')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    return normalized || `news-${Date.now()}`;
}

async function uniqueSlug(baseSlug, excludeId = null) {
    const base = slugify(baseSlug);
    let candidate = base;
    let suffix = 2;

    while (true) {
        const query = { slug: candidate };
        if (excludeId) query._id = { $ne: excludeId };
        const exists = await News.exists(query);
        if (!exists) return candidate;
        candidate = `${base}-${suffix}`;
        suffix += 1;
    }
}

function formatAuthor(row) {
    const adminName = `${row.authorUser?.firstName || ''} ${row.authorUser?.lastName || ''}`.trim();
    return {
        type: 'admin',
        name: adminName || 'EventSport Team',
        userId: row.authorUser?._id || row.authorUser,
    };
}

function formatNews(row, { includeContent = false } = {}) {
    return {
        _id: row._id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        ...(includeContent ? { content: row.content } : {}),
        coverImage: row.coverImage?.path
            ? {
                  path: uploadsRelativePath(row.coverImage.path),
                  originalName: row.coverImage.originalName,
                  mimeType: row.coverImage.mimeType,
                  size: row.coverImage.size,
              }
            : null,
        sportGroup: row.sportGroup || null,
        sport: row.sport || null,
        author: formatAuthor(row),
        status: row.status,
        isActive: row.isActive,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

async function validateSportPair(sportGroupId, sportId) {
    const [sportGroup, sport] = await Promise.all([
        SportGroup.findById(sportGroupId).select('_id').lean(),
        Sport.findById(sportId).select('_id group').lean(),
    ]);

    if (!sportGroup) throw new AppError(404, 'Sport group not found');
    if (!sport) throw new AppError(404, 'Sport not found');
    if (String(sport.group) !== String(sportGroupId)) {
        throw new AppError(400, 'Selected sport does not belong to the selected sport group');
    }
}

async function removeFileIfPresent(fileMeta) {
    if (!fileMeta?.path) return;
    try {
        await unlink(fileMeta.path);
    } catch (err) {
        console.warn('Failed to delete news image:', err?.message || err);
    }
}

function buildListFilter(parsed, { publicOnly = false } = {}) {
    const filter = {};

    if (publicOnly) {
        filter.status = 'published';
        filter.isActive = true;
        filter.publishedAt = { $lte: new Date() };
    } else if (parsed.status && parsed.status !== 'all') {
        filter.status = parsed.status;
    }

    if (parsed.sportGroup) filter.sportGroup = parsed.sportGroup;
    if (parsed.sport) filter.sport = parsed.sport;

    if (parsed.search) {
        const regex = new RegExp(String(parsed.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: regex }, { excerpt: regex }, { content: regex }];
    }

    return filter;
}

async function listNews(req, res, next, options = {}) {
    try {
        const parsed = newsListQuerySchema.parse(req.query || {});
        const skip = (parsed.page - 1) * parsed.limit;
        const filter = buildListFilter(parsed, options);

        const [rows, total] = await Promise.all([
            News.find(filter)
                .populate({ path: 'sportGroup', select: 'name' })
                .populate({ path: 'sport', select: 'name groupName' })
                .populate({ path: 'authorUser', select: 'firstName lastName' })
                .sort({ publishedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(parsed.limit)
                .lean(),
            News.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: rows.map((row) => formatNews(row, { includeContent: options.includeContent === true })),
            pagination: {
                currentPage: parsed.page,
                totalPages: Math.max(1, Math.ceil(total / parsed.limit) || 1),
                total,
                perPage: parsed.limit,
            },
        });
    } catch (err) {
        next(err);
    }
}

export const listPublicNews = (req, res, next) =>
    listNews(req, res, next, { publicOnly: true });

export const getPublicNewsBySlug = async (req, res, next) => {
    try {
        const slug = String(req.params.slug || '').trim().toLowerCase();
        if (!NEWS_SLUG_RE.test(slug)) throw new AppError(400, 'Invalid news slug');

        const row = await News.findOne({
            slug,
            status: 'published',
            isActive: true,
            publishedAt: { $lte: new Date() },
        })
            .populate({ path: 'sportGroup', select: 'name' })
            .populate({ path: 'sport', select: 'name groupName' })
            .populate({ path: 'authorUser', select: 'firstName lastName' })
            .lean();

        if (!row) throw new AppError(404, 'News not found');
        res.status(200).json({ success: true, data: formatNews(row, { includeContent: true }) });
    } catch (err) {
        next(err);
    }
};

export const listAdminNews = (req, res, next) =>
    listNews(req, res, next, { includeContent: true });

export const createAdminNews = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const parsed = newsPayloadSchema.parse(parseNewsData(req));
        await validateSportPair(parsed.sportGroup, parsed.sport);

        const slug = await uniqueSlug(parsed.slug || parsed.title);
        const now = new Date();
        const row = await News.create({
            ...parsed,
            slug,
            coverImage: req.fileMeta || undefined,
            authorUser: req.user._id,
            publishedAt: parsed.status === 'published' ? now : null,
        });

        const populated = await News.findById(row._id)
            .populate({ path: 'sportGroup', select: 'name' })
            .populate({ path: 'sport', select: 'name groupName' })
            .populate({ path: 'authorUser', select: 'firstName lastName' })
            .lean();

        res.status(201).json({
            success: true,
            data: formatNews(populated, { includeContent: true }),
        });
    } catch (err) {
        if (req.fileMeta) await removeFileIfPresent(req.fileMeta);
        if (err?.code === 11000) return next(new AppError(409, 'News slug already exists'));
        next(err);
    }
};

export const updateAdminNews = async (req, res, next) => {
    try {
        const newsId = mongoObjectId.parse(req.params.newsId);
        const row = await News.findById(newsId);
        if (!row) throw new AppError(404, 'News not found');

        const parsed = newsUpdateSchema.parse(parseNewsData(req));
        if (parsed.sportGroup || parsed.sport) {
            await validateSportPair(
                parsed.sportGroup || String(row.sportGroup),
                parsed.sport || String(row.sport)
            );
        }

        if (parsed.title !== undefined) row.title = parsed.title;
        if (parsed.excerpt !== undefined) row.excerpt = parsed.excerpt;
        if (parsed.content !== undefined) row.content = parsed.content;
        if (parsed.sportGroup !== undefined) row.sportGroup = parsed.sportGroup;
        if (parsed.sport !== undefined) row.sport = parsed.sport;
        if (parsed.isActive !== undefined) row.isActive = parsed.isActive;
        if (parsed.status !== undefined && parsed.status !== row.status) {
            row.status = parsed.status;
            if (parsed.status === 'published' && !row.publishedAt) {
                row.publishedAt = new Date();
            }
        }
        if (parsed.slug !== undefined && parsed.slug.trim()) {
            row.slug = await uniqueSlug(parsed.slug, row._id);
        }

        if (req.fileMeta) {
            await removeFileIfPresent(row.coverImage);
            row.coverImage = req.fileMeta;
        } else if (parsed.removeCoverImage) {
            await removeFileIfPresent(row.coverImage);
            row.coverImage = undefined;
        }

        await row.save();

        const populated = await News.findById(row._id)
            .populate({ path: 'sportGroup', select: 'name' })
            .populate({ path: 'sport', select: 'name groupName' })
            .populate({ path: 'authorUser', select: 'firstName lastName' })
            .lean();

        res.status(200).json({
            success: true,
            data: formatNews(populated, { includeContent: true }),
        });
    } catch (err) {
        if (req.fileMeta) await removeFileIfPresent(req.fileMeta);
        if (err?.code === 11000) return next(new AppError(409, 'News slug already exists'));
        next(err);
    }
};

export const deleteAdminNews = async (req, res, next) => {
    try {
        const newsId = mongoObjectId.parse(req.params.newsId);
        const row = await News.findById(newsId);
        if (!row) throw new AppError(404, 'News not found');

        row.isActive = false;
        row.status = 'draft';
        await row.save();

        res.status(200).json({ success: true, message: 'News unpublished' });
    } catch (err) {
        next(err);
    }
};
