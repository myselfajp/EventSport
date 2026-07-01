import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        toCoach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            default: null,
        },
        toFacility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            default: null,
        },
        toEvent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            default: null,
        },
        point: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
        },
    },
    { timestamps: true }
);

pointSchema.index(
    { fromUser: 1, toCoach: 1 },
    { unique: true, partialFilterExpression: { toCoach: { $type: 'objectId' } } }
);
pointSchema.index({ toCoach: 1, updatedAt: -1 });

export default mongoose.model('Point', pointSchema);
