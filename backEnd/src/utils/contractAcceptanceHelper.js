import LegalDocument from '../models/legalDocumentModel.js';
import StaticPage from '../models/staticPageModel.js';
import ContractAcceptance from '../models/contractAcceptanceModel.js';
import { AppError } from './appError.js';
import { Types } from 'mongoose';
import { COACH_PROFILE_REQUIRED_DOC_TYPES } from '../constants/contractDocuments.js';

/** @deprecated Use COACH_PROFILE_REQUIRED_DOC_TYPES — kept for redirects/migration references. */
export const COACH_PROFILE_STATIC_SLUGS = [
    'sozlesmeler-antrenor',
    'sozlesmeler-ek-1',
    'sozlesmeler-ek-2',
    'sozlesmeler-ek-3',
];

export function clientMetaFromRequest(req) {
    const ip =
        typeof req.headers['x-forwarded-for'] === 'string'
            ? req.headers['x-forwarded-for'].split(',')[0].trim()
            : req.socket?.remoteAddress;
    return {
        ipAddress: ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
    };
}

export async function validateActiveLegalDocument(versionId, expectedDocType) {
    if (!Types.ObjectId.isValid(versionId)) {
        throw new AppError(400, `Invalid ${expectedDocType} document id.`);
    }
    const doc = await LegalDocument.findById(versionId).lean();
    if (!doc || doc.docType !== expectedDocType || !doc.isActive) {
        throw new AppError(400, `Invalid or inactive ${expectedDocType} document version.`);
    }
    return doc;
}

export async function recordLegalAcceptance(req, userId, opts) {
    const {
        versionId,
        expectedDocType,
        context,
        eventId = null,
        reservationId = null,
        acceptedAt = new Date(),
    } = opts;

    const doc = await validateActiveLegalDocument(versionId, expectedDocType);
    const meta = clientMetaFromRequest(req);

    return ContractAcceptance.create({
        user: userId,
        contractKey: doc.docType,
        source: 'legal',
        title: doc.title,
        legalDocumentId: doc._id,
        version: doc.version,
        context,
        event: eventId,
        reservation: reservationId,
        acceptedAt,
        ...meta,
    });
}

export async function recordStaticAcceptancesBySlugs(req, userId, slugs, context) {
    const meta = clientMetaFromRequest(req);
    const acceptedAt = new Date();
    const entries = [];

    for (const name of slugs) {
        const page = await StaticPage.findOne({ name, isActive: true }).lean();
        if (!page) {
            throw new AppError(
                400,
                `Required contract page "${name}" is not published. Contact administrator.`
            );
        }
        entries.push({
            user: userId,
            contractKey: name,
            source: 'static',
            title: page.title,
            staticPageId: page._id,
            staticPageUpdatedAt: page.updatedAt,
            context,
            acceptedAt,
            ...meta,
        });
    }

    if (entries.length === 0) return [];
    return ContractAcceptance.insertMany(entries);
}

/** Records acceptance of all active coach legal documents (first coach profile). */
export async function recordCoachProfileLegalAcceptances(req, userId, context = 'coach_profile') {
    const meta = clientMetaFromRequest(req);
    const acceptedAt = new Date();
    const entries = [];

    for (const docType of COACH_PROFILE_REQUIRED_DOC_TYPES) {
        const doc = await LegalDocument.findOne({ docType, isActive: true }).lean();
        if (!doc) {
            throw new AppError(
                400,
                `Required coach contract "${docType}" has no active version. Contact administrator.`
            );
        }
        entries.push({
            user: userId,
            contractKey: doc.docType,
            source: 'legal',
            title: doc.title,
            legalDocumentId: doc._id,
            version: doc.version,
            context,
            acceptedAt,
            ...meta,
        });
    }

    if (entries.length === 0) return [];
    return ContractAcceptance.insertMany(entries);
}

export async function recordMarketingConsent(req, userId, agreed, context = 'marketing') {
    if (!agreed) return null;
    const meta = clientMetaFromRequest(req);
    return ContractAcceptance.create({
        user: userId,
        contractKey: 'marketing_consent',
        source: 'declaration',
        title: 'Commercial electronic messages consent',
        context,
        acceptedAt: new Date(),
        ...meta,
    });
}
