import mongoose from 'mongoose';

const billingInfoSchema = new mongoose.Schema(
    {
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant',
        },
        address: {
            type: String,
            required: true,
        },
        taxNumber: {
            type: String,
            required: true,
        },
        taxOffice: {
            type: String,
            required: true,
        },
        iban: {
            type: String,
        },
    },
    { timestamps: true }
);

export default mongoose.model('BillingInfo', billingInfoSchema);
