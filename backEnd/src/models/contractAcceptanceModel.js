import mongoose from 'mongoose';

const contractAcceptanceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        contractKey: {
            type: String,
            required: true,
            index: true,
        },
        source: {
            type: String,
            enum: ['legal', 'static', 'declaration'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        legalDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LegalDocument',
            default: null,
        },
        version: {
            type: Number,
            default: null,
        },
        staticPageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StaticPage',
            default: null,
        },
        staticPageUpdatedAt: {
            type: Date,
            default: null,
        },
        context: {
            type: String,
            enum: ['signup', 'event_reservation', 'coach_profile', 'marketing'],
            required: true,
            index: true,
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            default: null,
        },
        reservation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Reservation',
            default: null,
        },
        acceptedAt: {
            type: Date,
            required: true,
            default: () => new Date(),
            index: true,
        },
        ipAddress: { type: String },
        userAgent: { type: String },
    },
    { timestamps: true }
);

contractAcceptanceSchema.index({ user: 1, acceptedAt: -1 });
contractAcceptanceSchema.index({ contractKey: 1, acceptedAt: -1 });

export default mongoose.model('ContractAcceptance', contractAcceptanceSchema);
