import LegalDocument from '../models/legalDocumentModel.js';
import { migrateStaticContractsToLegal } from './migrateStaticContractsToLegal.js';

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

const DEFAULT_DISTANCE_SELLING = {
    docType: 'distance_selling',
    title: 'Mesafeli Satış Sözleşmesi',
    content:
        'Mesafeli satış sözleşmesi metni buraya eklenebilir. Metni Admin panelinden Legal bölümünden düzenleyebilirsiniz.',
};

const DEFAULT_EVENT_CONTRACT = {
    docType: 'event_contract',
    title: 'Etkinlik Sözleşmesi',
    content:
        'Etkinlik sözleşmesi metni buraya eklenebilir. Metni Admin panelinden Legal bölümünden düzenleyebilirsiniz.',
};

const DEFAULT_COMMERCIAL_MESSAGES = {
    docType: 'commercial_messages',
    title: 'Commercial Electronic Messages Consent (IYS)',
    content:
        '<p>This text describes consent for commercial electronic messages (SMS, email, phone) under applicable Turkish law and IYS (Message Management System) requirements.</p><p>Edit this content in Admin panel → Legal → Commercial messages.</p><p>Users who opt in during registration or profile setup agree to receive campaigns, promotions, and informational messages at the contact details they provide.</p>',
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

        const hasDistance = await LegalDocument.findOne({ docType: 'distance_selling', isActive: true });
        if (!hasDistance) {
            const existing = await LegalDocument.findOne({ docType: 'distance_selling' }).sort({ version: -1 });
            const version = (existing?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_DISTANCE_SELLING,
                version,
                isActive: true,
            });
            console.log('✅ Default Mesafeli Satış Sözleşmesi (v' + version + ') created and set active.');
        }

        const hasEvent = await LegalDocument.findOne({ docType: 'event_contract', isActive: true });
        if (!hasEvent) {
            const existing = await LegalDocument.findOne({ docType: 'event_contract' }).sort({ version: -1 });
            const version = (existing?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_EVENT_CONTRACT,
                version,
                isActive: true,
            });
            console.log('✅ Default Etkinlik Sözleşmesi (v' + version + ') created and set active.');
        }

        const hasCommercial = await LegalDocument.findOne({
            docType: 'commercial_messages',
            isActive: true,
        });
        if (!hasCommercial) {
            const existing = await LegalDocument.findOne({ docType: 'commercial_messages' }).sort({
                version: -1,
            });
            const version = (existing?.version ?? 0) + 1;
            await LegalDocument.create({
                ...DEFAULT_COMMERCIAL_MESSAGES,
                version,
                isActive: true,
            });
            console.log(
                '✅ Default Commercial messages / IYS consent (v' + version + ') created and set active.'
            );
        }

        await migrateStaticContractsToLegal();
    } catch (err) {
        console.error('❌ Error initializing legal documents:', err.message);
    }
};
