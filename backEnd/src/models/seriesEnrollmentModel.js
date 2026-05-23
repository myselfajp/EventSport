import mongoose from 'mongoose';

/** Future: one payment enrolls participant in all sessions of a series. */
const seriesEnrollmentSchema = new mongoose.Schema(
    {
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant',
            required: true,
            index: true,
        },
        series: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EventSeries',
            required: true,
            index: true,
        },
        reservations: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Reservation',
            },
        ],
        sessionCount: { type: Number, required: true, min: 1 },
        totalFee: { type: Number, default: 0 },
        isPaid: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['active', 'cancelled'],
            default: 'active',
        },
    },
    { timestamps: true }
);

seriesEnrollmentSchema.index({ participant: 1, series: 1 }, { unique: true });

export default mongoose.model('SeriesEnrollment', seriesEnrollmentSchema);
