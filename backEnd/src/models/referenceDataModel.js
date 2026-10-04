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
        icon: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
        },
        coachBadge: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
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
        /** Hours before event startTime when check-in / late join window opens */
        checkInOpensHoursBeforeStart: {
            type: Number,
            default: 48,
            min: 0,
            max: 720,
        },
    },
    { timestamps: true }
);

const appEnumSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            required: true,
            enum: ['eventType', 'priceType', 'membershipLevel'],
            index: true,
        },
        value: {
            type: String,
            required: true,
            trim: true,
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

appEnumSchema.index({ category: 1, value: 1 }, { unique: true });

export const Sport = mongoose.model('Sport', sportSchema);
export const SportGroup = mongoose.model('SportGroup', sportGroupSchema);
export const SportGoal = mongoose.model('SportGoal', sportGoalSchema);
export const EventStyle = mongoose.model('EventStyle', eventStyleSchema);
export const AppEnum = mongoose.model('AppEnum', appEnumSchema);
