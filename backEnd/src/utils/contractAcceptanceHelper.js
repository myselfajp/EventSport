import LegalDocument from '../models/legalDocumentModel.js';
import StaticPage from '../models/staticPageModel.js';
import ContractAcceptance from '../models/contractAcceptanceModel.js';
import User from '../models/userModel.js';
import Event from '../models/eventModel.js';
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

export function renderContractContent(html, user, event = null, date = new Date()) {
    if (!html) return '';
    const dateFormatted = new Date(date).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const fullName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
          user.participant?.name ||
          user.coach?.name ||
          ''
        : '';
    const email = user?.email || '';
    const phone = user?.phone || user?.phoneNumber || '';

    let locationText = '';
    if (user?.location) {
        const loc = user.location;
        const districtName =
            typeof loc.district === 'object' && loc.district !== null
                ? loc.district.name || ''
                : typeof loc.district === 'string'
                ? loc.district
                : '';
        locationText = [districtName, loc.city, loc.country].filter(Boolean).join(' / ');
    }

    let coachBranch = '';
    if (user?.coach?.branches && user.coach.branches.length > 0) {
        coachBranch = user.coach.branches
            .map((b) => (typeof b === 'object' && b !== null ? b.name : b))
            .filter(Boolean)
            .join(', ');
    }

    const eventName = event?.name || '';
    const eventPrice =
        event?.participationFee != null
            ? `${event.participationFee} ${event.currency || 'TRY'}`
            : '';

    const replacements = {
        '{{ALICI_AD_SOYAD}}': fullName || '[Alıcı Adı Soyadı]',
        '{{BUYER_FULL_NAME}}': fullName || '[Buyer Full Name]',
        '{{BUYER_NAME}}': fullName || '[Buyer Name]',
        '{{ALICI_EPOSTA}}': email || '[Alıcı E-posta]',
        '{{BUYER_EMAIL}}': email || '[Buyer Email]',
        '{{ALICI_TELEFON}}': phone || '[Alıcı Telefon]',
        '{{BUYER_PHONE}}': phone || '[Buyer Phone]',
        '{{ALICI_KONUM}}': locationText || '[Alıcı İl / İlçe]',
        '{{ALICI_ADRES}}': locationText || '[Alıcı Adres]',
        '{{BUYER_LOCATION}}': locationText || '[Buyer Location]',
        '{{KOC_BRANS}}': coachBranch || '[Antrenörlük Branşı]',
        '{{COACH_BRANCH}}': coachBranch || '[Coaching Branch]',
        '{{ETKINLIK_ADI}}': eventName || '[Etkinlik]',
        '{{EVENT_NAME}}': eventName || '[Event Name]',
        '{{UCRET}}': eventPrice || '[Ücret]',
        '{{PRICE}}': eventPrice || '[Price]',
        '{{TARIH}}': dateFormatted,
        '{{DATE}}': dateFormatted,
    };

    let result = html;
    for (const [placeholder, val] of Object.entries(replacements)) {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        result = result.replace(regex, val);
    }
    return result;
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

    let userDoc = opts.user || req.user || null;
    if (!userDoc && userId) {
        try {
            userDoc = await User.findById(userId).lean();
        } catch {
            userDoc = null;
        }
    }

    let eventDoc = opts.event || null;
    if (!eventDoc && eventId) {
        try {
            eventDoc = await Event.findById(eventId).select('name participationFee currency').lean();
        } catch {
            eventDoc = null;
        }
    }

    let renderedContent = null;
    if (doc.content) {
        renderedContent = renderContractContent(doc.content, userDoc, eventDoc, acceptedAt);
    }

    const signerName = userDoc
        ? [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim()
        : null;
    const signerEmail = userDoc?.email || null;
    const signerPhone = userDoc?.phone || null;

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
        renderedContent,
        signerName,
        signerEmail,
        signerPhone,
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

function resolveCookieConsentChoice(preferences) {
    const { functional, analytics, marketing } = preferences;
    if (functional && analytics && marketing) return 'accept_all';
    if (!functional && !analytics && !marketing) return 'essential_only';
    return 'custom';
}

function cookieConsentTitle(choice) {
    switch (choice) {
        case 'accept_all':
            return 'Cookie consent — Accept all';
        case 'essential_only':
            return 'Cookie consent — Essential only';
        default:
            return 'Cookie consent — Custom preferences';
    }
}

export async function recordCookieConsent(req, userId, preferences, opts = {}) {
    const { visitorKey = null, consentedAt = new Date() } = opts;
    const meta = clientMetaFromRequest(req);
    const choice = resolveCookieConsentChoice(preferences);

    const activePolicy = await LegalDocument.findOne({
        docType: 'cookie_policy',
        isActive: true,
    }).lean();

    return ContractAcceptance.create({
        user: userId || null,
        contractKey: 'cookie_consent',
        source: activePolicy ? 'legal' : 'declaration',
        title: cookieConsentTitle(choice),
        legalDocumentId: activePolicy?._id ?? null,
        version: activePolicy?.version ?? null,
        context: 'cookie_consent',
        acceptedAt: consentedAt instanceof Date ? consentedAt : new Date(consentedAt),
        visitorKey: visitorKey || undefined,
        cookiePreferences: {
            choice,
            functional: !!preferences.functional,
            analytics: !!preferences.analytics,
            marketing: !!preferences.marketing,
        },
        ...meta,
    });
}
