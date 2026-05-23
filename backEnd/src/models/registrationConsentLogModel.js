import mongoose from 'mongoose';

/** Audit trail when a gamer registers for an event (health + legal acceptances). */
const registrationConsentLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant',
            required: true,
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        reservation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Reservation',
            required: true,
        },
        acceptHealthNoIllness: { type: Boolean, required: true },
        acceptHealthNoDisability: { type: Boolean, required: true },
        acceptHealthNoMedication: { type: Boolean, required: true },
        acceptHealthSportOk: { type: Boolean, required: true },
        acceptDistantSelling: { type: Boolean, required: true },
        acceptEventPurchaseTerms: { type: Boolean, required: true },
        ipAddress: { type: String },
        userAgent: { type: String },
    },
    { timestamps: true }
);

registrationConsentLogSchema.index({ reservation: 1 }, { unique: true });
registrationConsentLogSchema.index({ user: 1, event: 1 });

export default mongoose.model('RegistrationConsentLog', registrationConsentLogSchema);
