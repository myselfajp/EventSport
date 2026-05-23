import mongoose from 'mongoose';

const coachListingOrderSchema = new mongoose.Schema(
    {
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        series: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EventSeries',
            default: null,
        },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled'],
            default: 'confirmed',
        },
        confirmedAt: { type: Date, default: Date.now },
        note: { type: String, default: '', trim: true },
    },
    { timestamps: true }
);

export default mongoose.model('CoachListingOrder', coachListingOrderSchema);
