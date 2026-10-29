import RegistrationConsentItem from '../models/registrationConsentItemModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import { LOCKED_SIGNUP_DOC_TYPES } from '../constants/contractDocuments.js';
import {
    assertLockedSignupCoverage,
    attachActiveDocuments,
    normalizeCheckboxLabel,
    normalizeConsentDocTypes,
    seedRegistrationConsents,
} from '../utils/registrationConsentHelper.js';

function toPublicItem(item) {
    return {
        _id: item._id,
        checkboxLabel: item.checkboxLabel,
        docTypes: item.docTypes,
        required: item.required,
        sortOrder: item.sortOrder,
        documents: item.documents || [],
    };
}

export const getPublicSignupConsents = async (_req, res, next) => {
    try {
        await seedRegistrationConsents();
        const items = await RegistrationConsentItem.find({ enabled: true })
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();
        const withDocs = await attachActiveDocuments(items);

        const visible = [];
        const missingRequired = [];
        for (const item of withDocs) {
            const hasAllDocs = item.docTypes.every((docType) =>
                item.documents.some((doc) => doc.docType === docType)
            );
            if (!hasAllDocs) {
                if (item.required) {
                    missingRequired.push(
                        ...item.docTypes.filter(
                            (docType) => !item.documents.some((doc) => doc.docType === docType)
                        )
                    );
                }
                continue;
            }
            visible.push(toPublicItem(item));
        }

        const coveredRequired = new Set(
            visible.filter((item) => item.required).flatMap((item) => item.docTypes)
        );
        const missingLocked = LOCKED_SIGNUP_DOC_TYPES.filter(
            (docType) => !coveredRequired.has(docType)
        );

        res.status(200).json({
            success: true,
            data: {
                items: visible,
                ready: missingRequired.length === 0 && missingLocked.length === 0,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const listAdmin = async (_req, res, next) => {
    try {
        if (!_req.user || _req.user.role !== 0) {
            throw new AppError(!_req.user ? 401 : 403);
        }
        await seedRegistrationConsents();
        const items = await RegistrationConsentItem.find()
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();
        const withDocs = await attachActiveDocuments(items);

        res.status(200).json({
            success: true,
            data: withDocs,
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

        const checkboxLabel = normalizeCheckboxLabel(req.body?.checkboxLabel);
        const docTypes = normalizeConsentDocTypes(req.body?.docTypes);
        const required = req.body?.required !== false;
        const enabled = req.body?.enabled !== false;

        const maxRow = await RegistrationConsentItem.findOne()
            .sort({ sortOrder: -1 })
            .select('sortOrder')
            .lean();
        const sortOrder =
            typeof req.body?.sortOrder === 'number'
                ? req.body.sortOrder
                : (maxRow?.sortOrder ?? 0) + 1;

        await assertLockedSignupCoverage({
            created: { checkboxLabel, docTypes, required, enabled, sortOrder },
        });

        const item = await RegistrationConsentItem.create({
            checkboxLabel,
            docTypes,
            required,
            enabled,
            sortOrder,
        });

        res.status(201).json({
            success: true,
            data: item,
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

        const itemId = mongoObjectId.parse(req.params.itemId);
        const item = await RegistrationConsentItem.findById(itemId);
        if (!item) {
            throw new AppError(404, 'Registration checkbox not found.');
        }

        const updatedFields = {};
        if (req.body?.checkboxLabel !== undefined) {
            updatedFields.checkboxLabel = normalizeCheckboxLabel(req.body.checkboxLabel);
        }
        if (req.body?.docTypes !== undefined) {
            updatedFields.docTypes = normalizeConsentDocTypes(req.body.docTypes);
        }
        if (req.body?.required !== undefined) {
            updatedFields.required = Boolean(req.body.required);
        }
        if (req.body?.enabled !== undefined) {
            updatedFields.enabled = Boolean(req.body.enabled);
        }
        if (typeof req.body?.sortOrder === 'number') {
            updatedFields.sortOrder = req.body.sortOrder;
        }

        if (Object.keys(updatedFields).length === 0) {
            throw new AppError(400, 'Provide at least one field to update.');
        }

        await assertLockedSignupCoverage({
            updatedId: itemId,
            updatedFields,
        });

        Object.assign(item, updatedFields);
        await item.save();

        res.status(200).json({
            success: true,
            data: item,
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

        const itemId = mongoObjectId.parse(req.params.itemId);
        const item = await RegistrationConsentItem.findById(itemId);
        if (!item) {
            throw new AppError(404, 'Registration checkbox not found.');
        }

        await assertLockedSignupCoverage({ removedId: itemId });
        await item.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Registration checkbox deleted.',
        });
    } catch (err) {
        next(err);
    }
};

export const reorder = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
        if (ids.length === 0) {
            throw new AppError(400, 'ids array is required.');
        }

        const parsedIds = ids.map((id) => mongoObjectId.parse(id));
        await Promise.all(
            parsedIds.map((id, index) =>
                RegistrationConsentItem.updateOne({ _id: id }, { $set: { sortOrder: index + 1 } })
            )
        );

        const items = await RegistrationConsentItem.find()
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: items,
        });
    } catch (err) {
        next(err);
    }
};
