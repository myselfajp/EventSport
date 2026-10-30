import RegistrationConsentItem from '../models/registrationConsentItemModel.js';
import LegalDocument from '../models/legalDocumentModel.js';
import { AppError } from './appError.js';
import { validateActiveLegalDocument } from './contractAcceptanceHelper.js';
import {
    DEFAULT_SIGNUP_CONSENTS,
    LOCKED_SIGNUP_DOC_TYPES,
} from '../constants/contractDocuments.js';

export function normalizeConsentDocTypes(input) {
    if (!Array.isArray(input)) {
        throw new AppError(400, 'Select at least one contract.');
    }
    const docTypes = [];
    for (const raw of input) {
        if (typeof raw !== 'string') continue;
        const docType = raw
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
        if (docType && !docTypes.includes(docType)) {
            docTypes.push(docType);
        }
    }
    if (docTypes.length === 0) {
        throw new AppError(400, 'Select at least one contract.');
    }
    return docTypes;
}

export function normalizeCheckboxLabel(input) {
    if (typeof input !== 'string' || !input.trim()) {
        throw new AppError(400, 'Checkbox sentence is required.');
    }
    const checkboxLabel = input.trim();
    if (checkboxLabel.length > 500) {
        throw new AppError(400, 'Checkbox sentence must be at most 500 characters.');
    }
    return checkboxLabel;
}

export async function seedRegistrationConsents() {
    const count = await RegistrationConsentItem.countDocuments();
    if (count > 0) return;
    await RegistrationConsentItem.insertMany(DEFAULT_SIGNUP_CONSENTS);
}

/** When a legal docType is renamed or removed, keep signup checkboxes in sync. */
export async function retargetConsentDocType(oldType, newType = null) {
    if (!oldType || oldType === newType) return;
    const items = await RegistrationConsentItem.find({ docTypes: oldType });
    for (const item of items) {
        if (newType) {
            item.docTypes = [...new Set(item.docTypes.map((type) => (type === oldType ? newType : type)))];
            item.checkboxLabel = item.checkboxLabel.split(`{{${oldType}}}`).join(`{{${newType}}}`);
            await item.save();
            continue;
        }
        item.docTypes = item.docTypes.filter((type) => type !== oldType);
        item.checkboxLabel = item.checkboxLabel.split(`{{${oldType}}}`).join('').replace(/\s+/g, ' ').trim();
        if (item.docTypes.length === 0) {
            await item.deleteOne();
            continue;
        }
        await item.save();
    }
    await assertLockedSignupCoverage();
}

export async function assertLockedSignupCoverage({
    removedId,
    updatedId,
    updatedFields,
    created,
} = {}) {
    let items = await RegistrationConsentItem.find().lean();
    if (removedId) {
        items = items.filter((item) => String(item._id) !== String(removedId));
    }
    if (updatedId) {
        items = items.map((item) =>
            String(item._id) === String(updatedId) ? { ...item, ...updatedFields } : item
        );
    }
    if (created) {
        items = [...items, created];
    }

    const covered = new Set(
        items
            .filter((item) => item.enabled && item.required)
            .flatMap((item) => item.docTypes || [])
    );
    const missing = LOCKED_SIGNUP_DOC_TYPES.filter((docType) => !covered.has(docType));
    if (missing.length > 0) {
        const labels = missing.join(' and ');
        throw new AppError(
            400,
            `Registration must keep ${labels} as a required agreement. Add ${labels} to an enabled required checkbox first.`
        );
    }
}

export function mergeSignupAcceptances(result) {
    const map = new Map();

    for (const row of result.acceptances || []) {
        if (!row || typeof row.docType !== 'string') continue;
        const docType = row.docType.trim();
        if (!docType || !row.versionId) continue;
        map.set(docType, {
            docType,
            versionId: String(row.versionId),
            agreed: row.agreed === true,
        });
    }

    if (result.termsVersionId) {
        map.set('terms', {
            docType: 'terms',
            versionId: String(result.termsVersionId),
            agreed: result.agreeTerms === true,
        });
    }
    if (result.kvkkVersionId) {
        map.set('kvkk', {
            docType: 'kvkk',
            versionId: String(result.kvkkVersionId),
            agreed: result.agreeKvkk === true,
        });
    }
    if (result.commercialMessagesVersionId) {
        map.set('commercial_messages', {
            docType: 'commercial_messages',
            versionId: String(result.commercialMessagesVersionId),
            agreed: result.marketingConsent === true,
        });
    }

    return [...map.values()];
}

async function resolveAcceptedDoc(byType, docType, mustAgree) {
    const acceptance = byType.get(docType);
    if (mustAgree && (!acceptance || !acceptance.agreed)) {
        throw new AppError(400, `You must agree to the required agreement (${docType}).`);
    }
    if (!acceptance?.agreed) return null;
    const doc = await validateActiveLegalDocument(acceptance.versionId, docType);
    return { docType, versionId: String(doc._id), doc };
}

function pushUnique(resolved, row) {
    if (!row) return;
    if (resolved.some((item) => item.docType === row.docType)) return;
    resolved.push(row);
}

export async function validateSignupAcceptances(acceptances) {
    await seedRegistrationConsents();
    const items = await RegistrationConsentItem.find({ enabled: true })
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean();
    const byType = new Map((acceptances || []).map((row) => [row.docType, row]));
    const resolved = [];

    if (items.length === 0) {
        pushUnique(resolved, await resolveAcceptedDoc(byType, 'terms', true));
        pushUnique(resolved, await resolveAcceptedDoc(byType, 'kvkk', true));
        pushUnique(resolved, await resolveAcceptedDoc(byType, 'commercial_messages', false));
        return resolved;
    }

    for (const item of items) {
        if (item.required) {
            for (const docType of item.docTypes) {
                pushUnique(resolved, await resolveAcceptedDoc(byType, docType, true));
            }
            continue;
        }

        const anyAgreed = item.docTypes.some((docType) => byType.get(docType)?.agreed);
        if (!anyAgreed) continue;
        for (const docType of item.docTypes) {
            pushUnique(resolved, await resolveAcceptedDoc(byType, docType, true));
        }
    }

    for (const docType of LOCKED_SIGNUP_DOC_TYPES) {
        if (!resolved.some((row) => row.docType === docType)) {
            throw new AppError(400, `You must agree to the required agreement (${docType}).`);
        }
    }

    return resolved;
}

export async function attachActiveDocuments(items) {
    const docTypes = [...new Set(items.flatMap((item) => item.docTypes || []))];
    const activeDocs = docTypes.length
        ? await LegalDocument.find({ docType: { $in: docTypes }, isActive: true }).lean()
        : [];
    const byType = new Map(activeDocs.map((doc) => [doc.docType, doc]));

    return items.map((item) => ({
        ...item,
        documents: (item.docTypes || [])
            .map((docType) => byType.get(docType))
            .filter(Boolean)
            .map((doc) => ({
                _id: doc._id,
                docType: doc.docType,
                title: doc.title,
                content: doc.content,
                version: doc.version,
            })),
    }));
}
