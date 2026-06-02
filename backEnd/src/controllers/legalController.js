import LegalDocument from '../models/legalDocumentModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import {
    ALL_CONTRACT_DOC_TYPES,
    CONTRACT_CATEGORIES,
    DOC_TYPE_TO_CATEGORY,
    LEGAL_DOC_TYPES,
    GAMER_DOC_TYPES,
    COACH_DOC_TYPES,
} from '../constants/contractDocuments.js';

const DOC_TYPES = ALL_CONTRACT_DOC_TYPES;

const DOC_TYPES_BY_CATEGORY = {
    legal: LEGAL_DOC_TYPES,
    gamer: GAMER_DOC_TYPES,
    coach: COACH_DOC_TYPES,
};

function buildListFilter(query) {
    const type = query?.type;
    const category = query?.category;
    if (type && DOC_TYPES.includes(type)) {
        return { docType: type };
    }
    if (category && CONTRACT_CATEGORIES.includes(category)) {
        return { docType: { $in: DOC_TYPES_BY_CATEGORY[category] } };
    }
    return {};
}

export const getActive = async (req, res, next) => {
    try {
        const type = req.query?.type;
        if (!type || !DOC_TYPES.includes(type)) {
            throw new AppError(
                400,
                `Invalid or missing type. Valid values: ${DOC_TYPES.join(', ')}.`
            );
        }

        const doc = await LegalDocument.findOne({ docType: type, isActive: true }).lean();
        if (!doc) {
            throw new AppError(404, `No active ${type} document found.`);
        }

        res.status(200).json({
            success: true,
            data: doc,
        });
    } catch (err) {
        next(err);
    }
};

export const list = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const filter = buildListFilter(req.query);

        const docs = await LegalDocument.find(filter)
            .sort({ docType: 1, version: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: docs,
        });
    } catch (err) {
        next(err);
    }
};

export const create = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const docType = req.body?.docType;
        const title = req.body?.title;
        const content = req.body?.content ?? '';
        const isActive = !!req.body?.isActive;

        if (!docType || !DOC_TYPES.includes(docType)) {
            throw new AppError(
                400,
                `docType is required and must be one of: ${DOC_TYPES.join(', ')}.`
            );
        }
        if (!title || typeof title !== 'string' || !title.trim()) {
            throw new AppError(400, 'title is required.');
        }

        const maxVersion = await LegalDocument.findOne({ docType })
            .sort({ version: -1 })
            .select('version')
            .lean();
        const version = (maxVersion?.version ?? 0) + 1;

        if (isActive) {
            await LegalDocument.updateMany({ docType }, { $set: { isActive: false } });
        }

        const doc = await LegalDocument.create({
            docType,
            version,
            title: title.trim(),
            content: typeof content === 'string' ? content : '',
            isActive,
        });

        res.status(201).json({
            success: true,
            data: doc,
        });
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const id = mongoObjectId.parse(req.params.documentId);
        const title = req.body?.title;
        const content = req.body?.content;

        const updateData = {};
        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
                throw new AppError(400, 'title must be a non-empty string.');
            }
            updateData.title = title.trim();
        }
        if (content !== undefined) {
            updateData.content = typeof content === 'string' ? content : '';
        }

        if (Object.keys(updateData).length === 0) {
            throw new AppError(400, 'Provide at least title or content to update.');
        }

        const doc = await LegalDocument.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        if (!doc) throw new AppError(404, 'Legal document not found.');

        res.status(200).json({
            success: true,
            data: doc,
        });
    } catch (err) {
        next(err);
    }
};

export const setActive = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const id = mongoObjectId.parse(req.params.documentId);
        const doc = await LegalDocument.findById(id);
        if (!doc) throw new AppError(404, 'Legal document not found.');

        await LegalDocument.updateMany({ docType: doc.docType }, { $set: { isActive: false } });
        doc.isActive = true;
        await doc.save();

        res.status(200).json({
            success: true,
            data: doc,
        });
    } catch (err) {
        next(err);
    }
};

export const getById = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const id = mongoObjectId.parse(req.params.documentId);
        const doc = await LegalDocument.findById(id).lean();
        if (!doc) throw new AppError(404, 'Legal document not found.');

        res.status(200).json({
            success: true,
            data: doc,
        });
    } catch (err) {
        next(err);
    }
};

/** Public catalog: active document per docType, grouped by category (legal / gamer / coach). */
export const getActiveCatalog = async (req, res, next) => {
    try {
        const activeDocs = await LegalDocument.find({ isActive: true })
            .select('docType title content version updatedAt')
            .lean();

        const byType = Object.fromEntries(activeDocs.map((d) => [d.docType, d]));

        const group = (types) =>
            types
                .map((docType) => {
                    const doc = byType[docType];
                    if (!doc) return null;
                    return {
                        docType,
                        category: DOC_TYPE_TO_CATEGORY[docType],
                        title: doc.title,
                        content: doc.content,
                        version: doc.version,
                        updatedAt: doc.updatedAt,
                    };
                })
                .filter(Boolean);

        res.status(200).json({
            success: true,
            data: {
                legal: group(LEGAL_DOC_TYPES),
                gamer: group(GAMER_DOC_TYPES),
                coach: group(COACH_DOC_TYPES),
            },
        });
    } catch (err) {
        next(err);
    }
};
