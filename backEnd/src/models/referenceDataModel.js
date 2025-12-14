import mongoose from 'mongoose';

const sportGroupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const sportSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SportGroup',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        groupName: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const sportGoalSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const eventStyleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        color: {
            type: String,
            match: /^#([0-9A-F]{6}|[0-9A-F]{3})$/i,
            required: true,
        },
    },
    { timestamps: true }
);

export const Sport = mongoose.model('Sport', sportSchema);
export const SportGroup = mongoose.model('SportGroup', sportGroupSchema);
export const SportGoal = mongoose.model('SportGoal', sportGoalSchema);
export const EventStyle = mongoose.model('EventStyle', eventStyleSchema);
