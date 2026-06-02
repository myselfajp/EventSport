import LegalDocument from '../models/legalDocumentModel.js';
import StaticPage from '../models/staticPageModel.js';
import {
    DEFAULT_TITLES_TR,
    LEGACY_STATIC_TO_DOC_TYPE,
    COACH_DOC_TYPES,
} from '../constants/contractDocuments.js';

/**
 * One-time style migration: copy legacy StaticPage contract content into LegalDocument
 * when no active legal version exists for that docType.
 */
export async function migrateStaticContractsToLegal() {
    for (const [slug, docType] of Object.entries(LEGACY_STATIC_TO_DOC_TYPE)) {
        const hasActive = await LegalDocument.findOne({ docType, isActive: true }).lean();
        if (hasActive) continue;

        const page = await StaticPage.findOne({ name: slug }).sort({ updatedAt: -1 }).lean();
        if (!page?.content && !page?.title) continue;

        const existing = await LegalDocument.findOne({ docType }).sort({ version: -1 }).lean();
        const version = (existing?.version ?? 0) + 1;

        await LegalDocument.updateMany({ docType }, { $set: { isActive: false } });
        await LegalDocument.create({
            docType,
            version,
            title: (page.title || DEFAULT_TITLES_TR[docType] || docType).trim(),
            content: typeof page.content === 'string' ? page.content : '',
            isActive: true,
        });
        console.log(`✅ Migrated static "${slug}" → legal ${docType} (v${version}).`);
    }

    for (const docType of COACH_DOC_TYPES) {
        const hasActive = await LegalDocument.findOne({ docType, isActive: true }).lean();
        if (hasActive) continue;

        const existing = await LegalDocument.findOne({ docType }).sort({ version: -1 }).lean();
        const version = (existing?.version ?? 0) + 1;
        await LegalDocument.create({
            docType,
            version,
            title: DEFAULT_TITLES_TR[docType],
            content: `<p>${DEFAULT_TITLES_TR[docType]} metni Admin panel → Contracts → Coach bölümünden düzenlenebilir.</p>`,
            isActive: true,
        });
        console.log(`✅ Default coach legal doc ${docType} (v${version}) created.`);
    }
}
