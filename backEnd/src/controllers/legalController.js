import LegalDocument from '../models/legalDocumentModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';

const DOC_TYPES = ['kvkk', 'terms'];

export const getActive = async (req, res, next) => {
    try {
        const type = req.query?.type;
        if (!type || !DOC_TYPES.includes(type)) {
            throw new AppError(400, 'Invalid or missing type. Use type=kvkk or type=terms.');
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

        const type = req.query?.type;
        const filter = type && DOC_TYPES.includes(type) ? { docType: type } : {};

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
            throw new AppError(400, 'docType is required and must be kvkk or terms.');
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
