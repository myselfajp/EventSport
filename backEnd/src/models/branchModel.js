import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema(
    {
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            required: true,
        },
        sport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sport',
            required: true,
        },
        branchOrder: {
            type: Number,
            required: true,
        },
        level: {
            type: Number,
            required: true,
        },
        certificate: {
            path: { type: String, required: true },
            originalName: { type: String, required: true },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true },
        },
        status: {
            type: String,
            enum: {
                values: ['Pending', 'Approved', 'Rejected'],
                message: 'Should be Pending, Approved, Rejected',
            },
            default: 'Pending',
        },
    },
    { timestamps: true }
);

branchSchema.index({ coach: 1, branchOrder: 1 }, { unique: true });
branchSchema.index({ coach: 1, sport: 1 }, { unique: true });
export default mongoose.model('Branch', branchSchema);
