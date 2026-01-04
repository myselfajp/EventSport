import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
    {
        // these two are coach
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        backupCoach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        name: {
            type: String,
            required: true,
        },
        photo: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
        },
        club: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Club',
        },
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ClubGroup',
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        capacity: {
            type: Number,
            required: true,
        },
        level: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
        },
        type: {
            type: String,
            required: true,
            enum: {
                values: ['Indoor', 'Outdoor', 'Online'],
                message: 'Should be Indoor, Outdoor, Online',
            },
        },
        style: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EventStyle',
            required: true,
        },
        eventStyle: {
            name: {
                type: String,
                required: true,
            },
            color: {
                type: String,
                required: true,
                match: /^#([0-9A-F]{6}|[0-9A-F]{3})$/i,
            },
        },
        private: {
            type: Boolean,
            required: true,
        },
        sportGroup: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SportGroup',
            required: true,
        },
        sport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sport',
            required: true,
        },
        banner: {
            path: { type: String, required: true },
            originalName: { type: String, required: true },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true },
        },
        point: {
            type: Number,
            default: null,
            min: 1,
            max: 10,
        },
        priceType: {
            type: String,
            required: true,
            enum: {
                values: ['Manual', 'Stable', 'Free'],
                message: 'Should be Manual, Stable, Free',
            },
        },
        participationFee: {
            type: Number,
            required: true,
        },
        isRecurring: {
            type: Boolean,
            required: true,
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
        },
        location: {
            type: String,
        },
        salon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
        },
        equipment: {
            type: String,
            required: true,
        },
        secretId: {
            type: String,
            default: null,
            select: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
