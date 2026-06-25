import crypto from 'crypto';
import argon2 from 'argon2';
import User from '../models/userModel.js';
import Participant from '../models/participantModel.js';
import Coach from '../models/coachModel.js';
import ContractAcceptance from '../models/contractAcceptanceModel.js';
import RegistrationConsentLog from '../models/registrationConsentLogModel.js';

const DEFAULT_RETENTION_MONTHS = 24;
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function retentionCutoffDate() {
    const months =
        Number(process.env.ACCOUNT_DELETION_RETENTION_MONTHS) || DEFAULT_RETENTION_MONTHS;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return cutoff;
}

export async function anonymizeUserRecord(user) {
    const userId = user._id;
    const anonEmail = `deleted_${userId}@anonymized.invalid`;
    const passwordHash = await argon2.hash(crypto.randomBytes(32).toString('hex'));

    await User.findByIdAndUpdate(userId, {
        $set: {
            firstName: 'Deleted',
            lastName: 'User',
            email: anonEmail,
            phone: '0000000000',
            age: new Date('1900-01-01'),
            photo: {},
            location: {},
            lastLoginIp: null,
            isEmailVerified: false,
            isPhoneVerified: false,
            password: passwordHash,
            marketingConsent: { agreed: false, consentedAt: null },
            accountAnonymizedAt: new Date(),
        },
    });

    if (user.participant) {
        await Participant.findByIdAndUpdate(user.participant, {
            $set: { name: 'Deleted User', location: {} },
        });
    }

    if (user.coach) {
        await Coach.findByIdAndUpdate(user.coach, {
            $set: { name: 'Deleted User', about: '' },
        });
    }

    await ContractAcceptance.updateMany(
        { user: userId },
        { $set: { ipAddress: null, userAgent: null } }
    );

    await RegistrationConsentLog.updateMany(
        { user: userId },
        { $set: { ipAddress: null, userAgent: null } }
    );
}

export async function runAccountAnonymizationJob() {
    const cutoff = retentionCutoffDate();

    const users = await User.find({
        accountDeletionRequestedAt: { $lte: cutoff },
        accountAnonymizedAt: null,
    }).select('_id participant coach');

    for (const user of users) {
        try {
            await anonymizeUserRecord(user);
            console.log(`Anonymized user ${user._id}`);
        } catch (err) {
            console.error(`Failed to anonymize user ${user._id}:`, err);
        }
    }

    return users.length;
}

export function startAccountAnonymizationScheduler() {
    if (process.env.ACCOUNT_ANONYMIZATION_ENABLED === 'false') {
        console.log('⏭️ Account anonymization scheduler disabled');
        return;
    }

    const intervalMs =
        Number(process.env.ACCOUNT_ANONYMIZATION_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

    const tick = () => {
        runAccountAnonymizationJob().catch((err) => {
            console.error('Account anonymization job failed:', err);
        });
    };

    tick();
    setInterval(tick, intervalMs);
    console.log(
        `✅ Account anonymization scheduler started (every ${intervalMs / 3600000} h)`
    );
}
