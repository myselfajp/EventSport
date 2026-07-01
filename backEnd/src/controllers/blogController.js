import { unlink } from 'fs/promises';
import { z } from 'zod';
import BlogPost from '../models/blogPostModel.js';
import { Sport, SportGroup } from '../models/referenceDataModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import { uploadsRelativePath } from '../utils/eventEndPhotoHelper.js';

const BLOG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const blogPayloadSchema = z.object({
    title: z.string().trim().min(3).max(180),
    slug: z.string().trim().max(220).optional().default(''),
    excerpt: z.string().trim().min(10).max(320),
    content: z.string().trim().min(30).max(20000),
    sportGroup: mongoObjectId,
    sport: mongoObjectId,
    status: z.enum(['draft', 'published']).optional().default('published'),
    isActive: z.coerce.boolean().optional().default(true),
});

const blogUpdateSchema = blogPayloadSchema.partial().extend({
    removeCoverImage: z.coerce.boolean().optional().default(false),
});

const blogListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(12),
    search: z.string().trim().max(120).optional().default(''),
    sportGroup: mongoObjectId.optional(),
    sport: mongoObjectId.optional(),
    status: z.enum(['draft', 'published', 'all']).optional().default('published'),
});

function parseBlogData(req) {
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
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'c')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    return normalized || `blog-${Date.now()}`;
}

async function uniqueSlug(baseSlug, excludeId = null) {
    const base = slugify(baseSlug);
    let candidate = base;
    let suffix = 2;

    while (true) {
        const query = { slug: candidate };
        if (excludeId) query._id = { $ne: excludeId };
        const exists = await BlogPost.exists(query);
        if (!exists) return candidate;
        candidate = `${base}-${suffix}`;
        suffix += 1;
    }
}

function formatAuthor(row) {
    if (row.authorType === 'coach') {
        const userName = `${row.authorUser?.firstName || ''} ${row.authorUser?.lastName || ''}`.trim();
        return {
            type: 'coach',
            name: row.authorCoach?.name || userName || 'Coach',
            userId: row.authorUser?._id || row.authorUser,
            coachId: row.authorCoach?._id || row.authorCoach || null,
        };
    }

    const adminName = `${row.authorUser?.firstName || ''} ${row.authorUser?.lastName || ''}`.trim();
    return {
        type: 'admin',
        name: adminName || 'EventSport Team',
        userId: row.authorUser?._id || row.authorUser,
        coachId: null,
    };
}

function formatBlog(row, { includeContent = false } = {}) {
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
        authorType: row.authorType,
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
        console.warn('Failed to delete blog image:', err?.message || err);
    }
}

function buildListFilter(parsed, { publicOnly = false, ownerUserId = null } = {}) {
    const filter = {};

    if (publicOnly) {
        filter.status = 'published';
        filter.isActive = true;
        filter.publishedAt = { $lte: new Date() };
    } else if (parsed.status && parsed.status !== 'all') {
        filter.status = parsed.status;
    }

    if (ownerUserId) {
        filter.authorUser = ownerUserId;
    }
    if (parsed.sportGroup) filter.sportGroup = parsed.sportGroup;
    if (parsed.sport) filter.sport = parsed.sport;

    if (parsed.search) {
        const regex = new RegExp(String(parsed.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: regex }, { excerpt: regex }, { content: regex }];
    }

    return filter;
}

async function listBlogs(req, res, next, options = {}) {
    try {
        const parsed = blogListQuerySchema.parse(req.query || {});
        const skip = (parsed.page - 1) * parsed.limit;
        const filter = buildListFilter(parsed, options);

        const [rows, total] = await Promise.all([
            BlogPost.find(filter)
                .populate({ path: 'sportGroup', select: 'name' })
                .populate({ path: 'sport', select: 'name groupName' })
                .populate({ path: 'authorUser', select: 'firstName lastName' })
                .populate({ path: 'authorCoach', select: 'name' })
                .sort({ publishedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(parsed.limit)
                .lean(),
            BlogPost.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: rows.map((row) => formatBlog(row, { includeContent: options.includeContent === true })),
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

export const listPublicBlogs = (req, res, next) =>
    listBlogs(req, res, next, { publicOnly: true });

export const getPublicBlogBySlug = async (req, res, next) => {
    try {
        const slug = String(req.params.slug || '').trim().toLowerCase();
        if (!BLOG_SLUG_RE.test(slug)) throw new AppError(400, 'Invalid blog slug');

        const row = await BlogPost.findOne({
            slug,
            status: 'published',
            isActive: true,
            publishedAt: { $lte: new Date() },
        })
            .populate({ path: 'sportGroup', select: 'name' })
            .populate({ path: 'sport', select: 'name groupName' })
            .populate({ path: 'authorUser', select: 'firstName lastName' })
            .populate({ path: 'authorCoach', select: 'name' })
            .lean();

        if (!row) throw new AppError(404, 'Blog post not found');
        res.status(200).json({ success: true, data: formatBlog(row, { includeContent: true }) });
    } catch (err) {
        next(err);
    }
};

export const listAdminBlogs = (req, res, next) =>
    listBlogs(req, res, next, { includeContent: true });

export const listCoachBlogs = (req, res, next) => {
    if (!req.user?.coach) return next(new AppError(403, 'Coach profile required'));
    return listBlogs(req, res, next, { ownerUserId: req.user._id, includeContent: true });
};

async function createBlog(req, res, next, { authorType }) {
    try {
        if (!req.user) throw new AppError(401);
        if (authorType === 'coach' && !req.user.coach) {
            throw new AppError(403, 'Coach profile required');
        }

        const parsed = blogPayloadSchema.parse(parseBlogData(req));
        await validateSportPair(parsed.sportGroup, parsed.sport);

        const slug = await uniqueSlug(parsed.slug || parsed.title);
        const now = new Date();
        const row = await BlogPost.create({
            ...parsed,
            slug,
            coverImage: req.fileMeta || undefined,
            authorUser: req.user._id,
            authorCoach: authorType === 'coach' ? req.user.coach : null,
            authorType,
            publishedAt: parsed.status === 'published' ? now : null,
        });

        const populated = await BlogPost.findById(row._id)
            .populate({ path: 'sportGroup', select: 'name' })
            .populate({ path: 'sport', select: 'name groupName' })
            .populate({ path: 'authorUser', select: 'firstName lastName' })
            .populate({ path: 'authorCoach', select: 'name' })
            .lean();

        res.status(201).json({
            success: true,
            data: formatBlog(populated, { includeContent: true }),
        });
    } catch (err) {
        if (req.fileMeta) await removeFileIfPresent(req.fileMeta);
        if (err?.code === 11000) return next(new AppError(409, 'Blog slug already exists'));
        next(err);
    }
}

export const createAdminBlog = (req, res, next) =>
    createBlog(req, res, next, { authorType: 'admin' });

export const createCoachBlog = (req, res, next) =>
    createBlog(req, res, next, { authorType: 'coach' });

async function updateBlog(req, res, next, { admin = false } = {}) {
    try {
        const blogId = mongoObjectId.parse(req.params.blogId);
        const row = await BlogPost.findById(blogId);
        if (!row) throw new AppError(404, 'Blog post not found');
        if (!admin && String(row.authorUser) !== String(req.user?._id)) {
            throw new AppError(403, 'You can only edit your own blog posts');
        }

        const parsed = blogUpdateSchema.parse(parseBlogData(req));
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

        const populated = await BlogPost.findById(row._id)
            .populate({ path: 'sportGroup', select: 'name' })
            .populate({ path: 'sport', select: 'name groupName' })
            .populate({ path: 'authorUser', select: 'firstName lastName' })
            .populate({ path: 'authorCoach', select: 'name' })
            .lean();

        res.status(200).json({
            success: true,
            data: formatBlog(populated, { includeContent: true }),
        });
    } catch (err) {
        if (req.fileMeta) await removeFileIfPresent(req.fileMeta);
        if (err?.code === 11000) return next(new AppError(409, 'Blog slug already exists'));
        next(err);
    }
}

export const updateAdminBlog = (req, res, next) => updateBlog(req, res, next, { admin: true });
export const updateCoachBlog = (req, res, next) => updateBlog(req, res, next);

async function deleteBlog(req, res, next, { admin = false } = {}) {
    try {
        const blogId = mongoObjectId.parse(req.params.blogId);
        const row = await BlogPost.findById(blogId);
        if (!row) throw new AppError(404, 'Blog post not found');
        if (!admin && String(row.authorUser) !== String(req.user?._id)) {
            throw new AppError(403, 'You can only delete your own blog posts');
        }

        row.isActive = false;
        row.status = 'draft';
        await row.save();

        res.status(200).json({ success: true, message: 'Blog post unpublished' });
    } catch (err) {
        next(err);
    }
}

export const deleteAdminBlog = (req, res, next) => deleteBlog(req, res, next, { admin: true });
export const deleteCoachBlog = (req, res, next) => deleteBlog(req, res, next);
