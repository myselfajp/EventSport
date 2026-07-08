import { unlink } from 'fs/promises';
import { z } from 'zod';
import Video from '../models/videoModel.js';
import { Sport, SportGroup } from '../models/referenceDataModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import { uploadsRelativePath } from '../utils/eventEndPhotoHelper.js';

const VIDEO_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalObjectId = z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    mongoObjectId.optional()
);

const videoPayloadSchema = z.object({
    title: z.string().trim().min(3).max(180),
    slug: z.string().trim().max(220).optional().default(''),
    excerpt: z.string().trim().min(10).max(320),
    description: z.string().trim().min(10).max(5000),
    videoType: z.enum(['educational', 'normal']),
    externalUrl: z.string().trim().max(500).optional().default(''),
    sportGroup: optionalObjectId,
    sport: optionalObjectId,
    status: z.enum(['draft', 'published']).optional().default('published'),
    isActive: z.coerce.boolean().optional().default(true),
});

const videoUpdateSchema = videoPayloadSchema.partial().extend({
    removeThumbnail: z.coerce.boolean().optional().default(false),
    removeVideoFile: z.coerce.boolean().optional().default(false),
});

const videoListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(12),
    search: z.string().trim().max(120).optional().default(''),
    sportGroup: optionalObjectId,
    sport: optionalObjectId,
    coachId: optionalObjectId,
    videoType: z.enum(['educational', 'normal']).optional(),
    excludeSlug: z.string().trim().max(220).optional().default(''),
    status: z.enum(['draft', 'published', 'all']).optional().default('published'),
});

function parseVideoData(req) {
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
    return normalized || `video-${Date.now()}`;
}

async function uniqueSlug(baseSlug, excludeId = null) {
    const base = slugify(baseSlug);
    let candidate = base;
    let suffix = 2;

    while (true) {
        const query = { slug: candidate };
        if (excludeId) query._id = { $ne: excludeId };
        const exists = await Video.exists(query);
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

function formatFileMeta(fileMeta) {
    if (!fileMeta?.path) return null;
    return {
        path: uploadsRelativePath(fileMeta.path),
        originalName: fileMeta.originalName,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size,
    };
}

function formatVideo(row, { includeDescription = false } = {}) {
    return {
        _id: row._id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        ...(includeDescription ? { description: row.description } : {}),
        videoType: row.videoType,
        thumbnail: formatFileMeta(row.thumbnail),
        videoFile: formatFileMeta(row.videoFile),
        externalUrl: row.externalUrl || '',
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

function pickFieldMeta(fileMeta, fieldName) {
    if (!fileMeta) return null;
    if (fileMeta.path) return null;
    const files = fileMeta[fieldName];
    if (!files) return null;
    return Array.isArray(files) ? files[0] : files;
}

async function validateSportPair(sportGroupId, sportId) {
    if (!sportGroupId && !sportId) return;
    if (sportGroupId && !sportId) {
        throw new AppError(400, 'Select a sport when a sport group is chosen');
    }
    if (!sportGroupId && sportId) {
        throw new AppError(400, 'Select a sport group when a sport is chosen');
    }

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

function validateVideoSource({ externalUrl, videoFileMeta, isUpdate = false, existingRow = null }) {
    const url = String(externalUrl || '').trim();
    const hasFile = !!videoFileMeta;
    const hasExistingFile = !!existingRow?.videoFile?.path;
    const hasExistingUrl = !!String(existingRow?.externalUrl || '').trim();

    if (url && hasFile) {
        throw new AppError(400, 'Provide either a video file or an external URL, not both');
    }

    if (!isUpdate && !url && !hasFile) {
        throw new AppError(400, 'Upload a video file or provide an external URL');
    }

    if (isUpdate && !url && !hasFile && !hasExistingFile && !hasExistingUrl) {
        throw new AppError(400, 'Upload a video file or provide an external URL');
    }
}

async function removeFileIfPresent(fileMeta) {
    if (!fileMeta?.path) return;
    try {
        await unlink(fileMeta.path);
    } catch (err) {
        console.warn('Failed to delete video file:', err?.message || err);
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
    if (parsed.coachId) filter.authorCoach = parsed.coachId;
    if (parsed.videoType) filter.videoType = parsed.videoType;
    if (parsed.sportGroup) filter.sportGroup = parsed.sportGroup;
    if (parsed.sport) filter.sport = parsed.sport;
    if (parsed.excludeSlug) filter.slug = { $ne: parsed.excludeSlug };

    if (parsed.search) {
        const regex = new RegExp(String(parsed.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ title: regex }, { excerpt: regex }, { description: regex }];
    }

    return filter;
}

async function listVideos(req, res, next, options = {}) {
    try {
        const parsed = videoListQuerySchema.parse(req.query || {});
        const skip = (parsed.page - 1) * parsed.limit;
        const filter = buildListFilter(parsed, options);

        const [rows, total] = await Promise.all([
            Video.find(filter)
                .populate({ path: 'sportGroup', select: 'name' })
                .populate({ path: 'sport', select: 'name groupName' })
                .populate({ path: 'authorUser', select: 'firstName lastName' })
                .populate({ path: 'authorCoach', select: 'name' })
                .sort({ publishedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(parsed.limit)
                .lean(),
            Video.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: rows.map((row) =>
                formatVideo(row, { includeDescription: options.includeDescription === true })
            ),
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

export const listPublicVideos = (req, res, next) =>
    listVideos(req, res, next, { publicOnly: true });

export const getPublicVideoBySlug = async (req, res, next) => {
    try {
        const slug = String(req.params.slug || '').trim().toLowerCase();
        if (!VIDEO_SLUG_RE.test(slug)) throw new AppError(400, 'Invalid video slug');

        const row = await Video.findOne({
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

        if (!row) throw new AppError(404, 'Video not found');
        res.status(200).json({ success: true, data: formatVideo(row, { includeDescription: true }) });
    } catch (err) {
        next(err);
    }
};

export const listAdminVideos = (req, res, next) =>
    listVideos(req, res, next, { includeDescription: true });

export const listCoachVideos = (req, res, next) => {
    if (!req.user?.coach) return next(new AppError(403, 'Coach profile required'));
    return listVideos(req, res, next, { ownerUserId: req.user._id, includeDescription: true });
};

async function createVideo(req, res, next, { authorType }) {
    const thumbnailMeta = pickFieldMeta(req.fileMeta, 'video-thumbnail');
    const videoFileMeta = pickFieldMeta(req.fileMeta, 'video-file');

    try {
        if (!req.user) throw new AppError(401);
        if (authorType === 'coach' && !req.user.coach) {
            throw new AppError(403, 'Coach profile required');
        }

        const parsed = videoPayloadSchema.parse(parseVideoData(req));
        await validateSportPair(parsed.sportGroup, parsed.sport);
        validateVideoSource({ externalUrl: parsed.externalUrl, videoFileMeta });

        if (!thumbnailMeta) {
            throw new AppError(400, 'Thumbnail image is required');
        }

        const slug = await uniqueSlug(parsed.slug || parsed.title);
        const now = new Date();
        const row = await Video.create({
            title: parsed.title,
            slug,
            excerpt: parsed.excerpt,
            description: parsed.description,
            videoType: parsed.videoType,
            externalUrl: parsed.externalUrl?.trim() || '',
            sportGroup: parsed.sportGroup || null,
            sport: parsed.sport || null,
            status: parsed.status,
            isActive: parsed.isActive,
            thumbnail: thumbnailMeta,
            videoFile: videoFileMeta || undefined,
            authorUser: req.user._id,
            authorCoach: authorType === 'coach' ? req.user.coach : null,
            authorType,
            publishedAt: parsed.status === 'published' ? now : null,
        });

        const populated = await Video.findById(row._id)
            .populate({ path: 'sportGroup', select: 'name' })
            .populate({ path: 'sport', select: 'name groupName' })
            .populate({ path: 'authorUser', select: 'firstName lastName' })
            .populate({ path: 'authorCoach', select: 'name' })
            .lean();

        res.status(201).json({
            success: true,
            data: formatVideo(populated, { includeDescription: true }),
        });
    } catch (err) {
        if (thumbnailMeta) await removeFileIfPresent(thumbnailMeta);
        if (videoFileMeta) await removeFileIfPresent(videoFileMeta);
        if (err?.code === 11000) return next(new AppError(409, 'Video slug already exists'));
        next(err);
    }
}

export const createAdminVideo = (req, res, next) =>
    createVideo(req, res, next, { authorType: 'admin' });

export const createCoachVideo = (req, res, next) =>
    createVideo(req, res, next, { authorType: 'coach' });

async function updateVideo(req, res, next, { admin = false } = {}) {
    const thumbnailMeta = pickFieldMeta(req.fileMeta, 'video-thumbnail');
    const videoFileMeta = pickFieldMeta(req.fileMeta, 'video-file');

    try {
        const videoId = mongoObjectId.parse(req.params.videoId);
        const row = await Video.findById(videoId);
        if (!row) throw new AppError(404, 'Video not found');
        if (!admin && String(row.authorUser) !== String(req.user?._id)) {
            throw new AppError(403, 'You can only edit your own videos');
        }

        const parsed = videoUpdateSchema.parse(parseVideoData(req));
        if (parsed.sportGroup !== undefined || parsed.sport !== undefined) {
            await validateSportPair(
                parsed.sportGroup !== undefined ? parsed.sportGroup : row.sportGroup,
                parsed.sport !== undefined ? parsed.sport : row.sport
            );
        }

        const nextExternalUrl =
            parsed.externalUrl !== undefined ? parsed.externalUrl.trim() : row.externalUrl;
        validateVideoSource({
            externalUrl: nextExternalUrl,
            videoFileMeta,
            isUpdate: true,
            existingRow: row,
        });

        if (parsed.title !== undefined) row.title = parsed.title;
        if (parsed.excerpt !== undefined) row.excerpt = parsed.excerpt;
        if (parsed.description !== undefined) row.description = parsed.description;
        if (parsed.videoType !== undefined) row.videoType = parsed.videoType;
        if (parsed.sportGroup !== undefined) row.sportGroup = parsed.sportGroup || null;
        if (parsed.sport !== undefined) row.sport = parsed.sport || null;

        const wasPublic = row.status === 'published' && row.isActive;

        if (parsed.status !== undefined) {
            row.status = parsed.status;
        }
        if (parsed.isActive !== undefined) {
            row.isActive = parsed.isActive;
        }

        if (parsed.status === 'published' && parsed.isActive !== false) {
            row.isActive = true;
        }

        const isPublic = row.status === 'published' && row.isActive;
        if (isPublic && !wasPublic) {
            row.publishedAt = new Date();
        } else if (isPublic && !row.publishedAt) {
            row.publishedAt = new Date();
        }

        if (parsed.slug !== undefined && parsed.slug.trim()) {
            row.slug = await uniqueSlug(parsed.slug, row._id);
        }

        if (thumbnailMeta) {
            await removeFileIfPresent(row.thumbnail);
            row.thumbnail = thumbnailMeta;
        } else if (parsed.removeThumbnail) {
            await removeFileIfPresent(row.thumbnail);
            row.thumbnail = undefined;
        }

        if (videoFileMeta) {
            await removeFileIfPresent(row.videoFile);
            row.videoFile = videoFileMeta;
            row.externalUrl = '';
        } else if (parsed.removeVideoFile) {
            await removeFileIfPresent(row.videoFile);
            row.videoFile = undefined;
        }

        if (parsed.externalUrl !== undefined) {
            const trimmed = parsed.externalUrl.trim();
            if (trimmed) {
                if (videoFileMeta || row.videoFile?.path) {
                    await removeFileIfPresent(row.videoFile);
                    row.videoFile = undefined;
                }
                row.externalUrl = trimmed;
            } else if (!videoFileMeta && !row.videoFile?.path) {
                row.externalUrl = '';
            }
        }

        await row.save();

        const populated = await Video.findById(row._id)
            .populate({ path: 'sportGroup', select: 'name' })
            .populate({ path: 'sport', select: 'name groupName' })
            .populate({ path: 'authorUser', select: 'firstName lastName' })
            .populate({ path: 'authorCoach', select: 'name' })
            .lean();

        res.status(200).json({
            success: true,
            data: formatVideo(populated, { includeDescription: true }),
        });
    } catch (err) {
        if (thumbnailMeta) await removeFileIfPresent(thumbnailMeta);
        if (videoFileMeta) await removeFileIfPresent(videoFileMeta);
        if (err?.code === 11000) return next(new AppError(409, 'Video slug already exists'));
        next(err);
    }
}

export const updateAdminVideo = (req, res, next) => updateVideo(req, res, next, { admin: true });
export const updateCoachVideo = (req, res, next) => updateVideo(req, res, next);

async function deleteVideo(req, res, next, { admin = false } = {}) {
    try {
        const videoId = mongoObjectId.parse(req.params.videoId);
        const row = await Video.findById(videoId);
        if (!row) throw new AppError(404, 'Video not found');
        if (!admin && String(row.authorUser) !== String(req.user?._id)) {
            throw new AppError(403, 'You can only delete your own videos');
        }

        await removeFileIfPresent(row.thumbnail);
        await removeFileIfPresent(row.videoFile);
        await Video.findByIdAndDelete(videoId);

        res.status(200).json({ success: true, message: 'Video deleted' });
    } catch (err) {
        next(err);
    }
}

export const deleteAdminVideo = (req, res, next) => deleteVideo(req, res, next, { admin: true });
export const deleteCoachVideo = (req, res, next) => deleteVideo(req, res, next);
