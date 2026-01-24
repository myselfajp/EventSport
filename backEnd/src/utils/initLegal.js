import LegalDocument from '../models/legalDocumentModel.js';

const DEFAULT_KVKK = {
    docType: 'kvkk',
    title: 'KVKK',
    content: 'KVKK (Personal Data Protection) text can be added here. Edit via Admin panel.',
};

const DEFAULT_TERMS = {
    docType: 'terms',
    title: 'Terms & Conditions',
    content: 'Terms and Conditions text can be added here. You can edit via Admin panel.',
};

export const initLegal = async () => {
    try {
        const hasKvkk = await LegalDocument.findOne({ docType: 'kvkk', isActive: true });
        if (!hasKvkk) {
            const existingKvkk = await LegalDocument.findOne({ docType: 'kvkk' }).sort({ version: -1 });
            const version = (existingKvkk?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_KVKK,
                version,
                isActive: true,
            });
            console.log('✅ Default KVKK (v' + version + ') created and set active.');
        }

        const hasTerms = await LegalDocument.findOne({ docType: 'terms', isActive: true });
        if (!hasTerms) {
            const existingTerms = await LegalDocument.findOne({ docType: 'terms' }).sort({ version: -1 });
            const version = (existingTerms?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_TERMS,
                version,
                isActive: true,
            });
            console.log('✅ Default Terms & Conditions (v' + version + ') created and set active.');
        }
    } catch (err) {
        console.error('❌ Error initializing legal documents:', err.message);
    }
};
