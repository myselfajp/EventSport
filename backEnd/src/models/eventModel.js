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
        /** Parent series when part of a recurring program. */
        series: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EventSeries',
            index: true,
            default: null,
        },
        /** 1-based index within the series. */
        sessionIndex: {
            type: Number,
            min: 1,
            default: null,
        },
        /** Optional override: hours before startTime when check-in opens (else Event Style default). */
        checkInOpensHoursBeforeStart: {
            type: Number,
            min: 0,
            max: 720,
            default: null,
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
        },
        /** Istanbul district for nearby recommendations and notifications (not set for Online events). */
        district: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'District',
            index: true,
        },
        /** Country-agnostic location fields (mirror of user location for nearby matching). */
        country: { type: String, trim: true, uppercase: true, maxlength: 2 },
        state: { type: String, trim: true, maxlength: 120 },
        city: { type: String, trim: true, maxlength: 120 },
        districtName: { type: String, trim: true, maxlength: 120 },
        /** Normalized locality key (e.g. `tr:van:edremit`, `us:hawaii:hilo`). */
        locationKey: { type: String, trim: true, maxlength: 160, index: true },
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
        /** Rules, notes, and extra info shown on the event page */
        eventDetails: {
            type: String,
            default: '',
            trim: true,
        },
        /** Optional external link (registration, stream, tickets, etc.) */
        eventLink: {
            type: String,
            default: '',
            trim: true,
        },
        secretId: {
            type: String,
            default: null,
            select: false,
        },
        status: {
            type: String,
            enum: {
                values: ['active', 'cancelled'],
                message: 'Should be active or cancelled',
            },
            default: 'active',
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
