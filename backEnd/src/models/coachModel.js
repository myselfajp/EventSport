import mongoose from 'mongoose';

const coachSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
        },
        membershipLevel: {
            type: String,
            default: null,
            enum: {
                values: ['Gold', 'Platinum', 'Bronze', 'Silver'],
                message: 'Should be Gold, Platinum, Bronze, Silver',
            },
        },
        point: {
            type: Number,
            default: null,
            max: [10, 'Must be less than 10'],
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);
export default mongoose.model('Coach', coachSchema);
