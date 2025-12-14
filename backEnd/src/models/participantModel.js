import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
        },
        mainSport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sport',
            required: [true, 'MainSport is required'],
        },
        skillLevel: {
            type: Number,
            required: [true, 'SkillLevel is required'],
            min: [1, 'Must be more than 1'],
            max: [10, 'Must be less than 10'],
        },
        point: {
            type: Number,
            default: null,
            min: [1, 'Must be more than 1'],
            max: [10, 'Must be less than 10'],
        },
        membershipLevel: {
            type: String,
            default: null,
            enum: {
                values: ['Gold', 'Platinum', 'Bronze', 'Silver'],
                message: 'Should be Gold, Platinum, Bronze, Silver',
            },
        },
        sportGoal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SportGoal',
            required: [true, 'SportGoal is required'],
        },
    },
    { timestamps: true }
);
export default mongoose.model('Participant', participantSchema);
