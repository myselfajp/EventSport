import LegalDocument from '../models/legalDocumentModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import {
    ALL_CONTRACT_DOC_TYPES,
    CONTRACT_CATEGORIES,
    LEGAL_DOC_TYPES,
    GAMER_DOC_TYPES,
    COACH_DOC_TYPES,
    COOKIE_DOC_TYPES,
    LOCKED_LEGAL_DOC_TYPES,
    getCategoryForDocType,
} from '../constants/contractDocuments.js';
import { recordLegalAcceptance } from '../utils/contractAcceptanceHelper.js';
import { retargetConsentDocType } from '../utils/registrationConsentHelper.js';

function normalizeLegalDocType(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    return raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

const DOC_TYPES_BY_CATEGORY = {
    legal: LEGAL_DOC_TYPES,
    gamer: GAMER_DOC_TYPES,
    coach: COACH_DOC_TYPES,
    cookie: COOKIE_DOC_TYPES,
};

let legacyTitlesMigrated = false;
async function ensureLegacyProviderTitlesMigrated() {
    if (legacyTitlesMigrated) return;
    try {
        await Promise.all([
            LegalDocument.updateMany(
                { docType: 'coach_equipment', title: { $regex: /coach equipment/i } },
                { $set: { title: 'Provider Equipment' } }
            ),
            LegalDocument.updateMany(
                { docType: 'coach_agreement', title: { $regex: /coach agreement/i } },
                { $set: { title: 'Provider Agreement' } }
            ),
            LegalDocument.updateMany(
                { docType: 'coach_privacy', title: { $regex: /coach privacy/i } },
                { $set: { title: 'Provider Privacy Agreement' } }
            ),
            LegalDocument.updateMany(
                { docType: 'coach_distance_selling', title: { $regex: /distance selling agreement \(coach\)/i } },
                { $set: { title: 'Distance Selling Agreement (Provider)' } }
            ),
            LegalDocument.updateMany(
                { docType: 'cookie_policy' },
                { $set: { category: 'cookie' } }
            ),
            ...Object.entries(DOC_TYPES_BY_CATEGORY).map(([cat, types]) =>
                LegalDocument.updateMany(
                    {
                        docType: { $in: types },
                        $or: [{ category: null }, { category: { $exists: false } }],
                    },
                    { $set: { category: cat } }
                )
            ),
        ]);
        legacyTitlesMigrated = true;
    } catch (e) {
        console.warn('Legacy title migration check:', e?.message);
    }
}

function buildListFilter(query) {
    const type = query?.type;
    const category = query?.category;
    if (type) {
        return { docType: type };
    }
    if (category && CONTRACT_CATEGORIES.includes(category)) {
        return {
            $or: [
                { category: category },
                { docType: { $in: DOC_TYPES_BY_CATEGORY[category] || [] } },
            ],
        };
    }
    return {};
}

export const getActive = async (req, res, next) => {
    try {
        await ensureLegacyProviderTitlesMigrated();
        const type = req.query?.type;
        if (!type || typeof type !== 'string') {
            throw new AppError(400, 'Invalid or missing type.');
        }

        const doc = await LegalDocument.findOne({ docType: type.trim(), isActive: true }).lean();
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

        await ensureLegacyProviderTitlesMigrated();
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

        let docType = typeof req.body?.docType === 'string' ? req.body.docType.trim() : '';
        const title = req.body?.title;
        const content = req.body?.content ?? '';
        const isActive = !!req.body?.isActive;
        const categoryInput = req.body?.category;

        if (!docType) {
            throw new AppError(400, 'docType is required.');
        }

        // Normalize docType slug (lowercase alphanumeric with underscores/hyphens)
        docType = docType.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_');

        if (!title || typeof title !== 'string' || !title.trim()) {
            throw new AppError(400, 'title is required.');
        }

        const category =
            categoryInput && CONTRACT_CATEGORIES.includes(categoryInput)
                ? categoryInput
                : getCategoryForDocType(docType) || 'coach';

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
            category,
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
        const doc = await LegalDocument.findById(id);
        if (!doc) throw new AppError(404, 'Legal document not found.');

        const title = req.body?.title;
        const content = req.body?.content;
        const nextDocType = req.body?.docType !== undefined
            ? normalizeLegalDocType(req.body.docType)
            : null;

        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
                throw new AppError(400, 'title must be a non-empty string.');
            }
            doc.title = title.trim();
        }
        if (content !== undefined) {
            doc.content = typeof content === 'string' ? content : '';
        }

        const oldDocType = doc.docType;
        if (nextDocType && nextDocType !== oldDocType) {
            if (LOCKED_LEGAL_DOC_TYPES.includes(oldDocType)) {
                throw new AppError(400, `Cannot change the document type of "${oldDocType}".`);
            }
            if (LOCKED_LEGAL_DOC_TYPES.includes(nextDocType)) {
                throw new AppError(400, `Cannot assign the system document type "${nextDocType}".`);
            }
            const clash = await LegalDocument.findOne({
                docType: nextDocType,
                version: doc.version,
                _id: { $ne: doc._id },
            }).lean();
            if (clash) {
                const maxVersion = await LegalDocument.findOne({ docType: nextDocType })
                    .sort({ version: -1 })
                    .select('version')
                    .lean();
                doc.version = (maxVersion?.version ?? 0) + 1;
            }
            doc.docType = nextDocType;
            doc.category = getCategoryForDocType(nextDocType) || doc.category;
        }

        if (
            title === undefined &&
            content === undefined &&
            (!nextDocType || nextDocType === oldDocType)
        ) {
            throw new AppError(400, 'Provide at least title, content, or document type to update.');
        }

        await doc.save();

        if (doc.docType !== oldDocType) {
            const remaining = await LegalDocument.countDocuments({ docType: oldDocType });
            if (remaining === 0) {
                await retargetConsentDocType(oldDocType, doc.docType);
            }
        }

        res.status(200).json({
            success: true,
            data: doc,
        });
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const id = mongoObjectId.parse(req.params.documentId);
        const doc = await LegalDocument.findById(id);
        if (!doc) throw new AppError(404, 'Legal document not found.');

        if (LOCKED_LEGAL_DOC_TYPES.includes(doc.docType)) {
            throw new AppError(400, `Cannot delete the system document type "${doc.docType}".`);
        }

        const oldDocType = doc.docType;
        await doc.deleteOne();

        const remaining = await LegalDocument.countDocuments({ docType: oldDocType });
        if (remaining === 0) {
            await retargetConsentDocType(oldDocType, null);
        }

        res.status(200).json({
            success: true,
            message: 'Document deleted.',
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

        let targetActive = !doc.isActive;
        if (req.body?.isActive !== undefined) {
            targetActive = Boolean(req.body.isActive);
        } else if (req.body?.active !== undefined) {
            targetActive = Boolean(req.body.active);
        }

        if (targetActive) {
            await LegalDocument.updateMany({ docType: doc.docType }, { $set: { isActive: false } });
            doc.isActive = true;
        } else {
            doc.isActive = false;
        }

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
        await ensureLegacyProviderTitlesMigrated();
        const activeDocs = await LegalDocument.find({ isActive: true })
            .select('docType title content version updatedAt category')
            .lean();

        const data = {
            legal: [],
            gamer: [],
            coach: [],
            cookie: [],
        };

        const processedDocTypes = new Set();

        const addDocs = (types, catKey) => {
            for (const dt of types) {
                const found = activeDocs.find((d) => d.docType === dt);
                if (found) {
                    data[catKey].push({
                        docType: found.docType,
                        category: catKey,
                        title: found.title,
                        content: found.content,
                        version: found.version,
                        updatedAt: found.updatedAt,
                    });
                    processedDocTypes.add(found.docType);
                }
            }
        };

        addDocs(LEGAL_DOC_TYPES, 'legal');
        addDocs(GAMER_DOC_TYPES, 'gamer');
        addDocs(COACH_DOC_TYPES, 'coach');
        addDocs(COOKIE_DOC_TYPES, 'cookie');

        // Add any custom/new docTypes to their respective category
        for (const doc of activeDocs) {
            if (processedDocTypes.has(doc.docType)) continue;
            const cat =
                doc.category && data[doc.category]
                    ? doc.category
                    : getCategoryForDocType(doc.docType) || 'coach';

            data[cat].push({
                docType: doc.docType,
                category: cat,
                title: doc.title,
                content: doc.content,
                version: doc.version,
                updatedAt: doc.updatedAt,
            });
            processedDocTypes.add(doc.docType);
        }

        res.status(200).json({
            success: true,
            data,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Record user acceptance of a legal document (e.g. coach upgrade distance selling agreement)
 */
export const acceptDocument = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }
        const user = req.user;
        const { docType, versionId, planKey, planName, planPrice, context } = req.body || {};
        if (!docType) {
            throw new AppError(400, 'docType is required.');
        }

        let targetDoc = null;
        if (versionId) {
            targetDoc = await LegalDocument.findById(versionId).lean();
        } else {
            targetDoc = await LegalDocument.findOne({ docType, isActive: true }).lean();
        }
        if (!targetDoc) {
            throw new AppError(404, `Active document for ${docType} not found.`);
        }

        const acceptance = await recordLegalAcceptance(req, user._id, {
            versionId: targetDoc._id,
            expectedDocType: targetDoc.docType,
            context: context || 'upgrade',
            user,
            planName: planName || planKey,
            planPrice,
        });

        res.status(200).json({
            success: true,
            message: 'Agreement accepted successfully.',
            data: acceptance,
        });
    } catch (err) {
        next(err);
    }
};
