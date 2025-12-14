import mongoose from 'mongoose';

const joinGroupSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ClubGroup',
            required: true,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const joinClubSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        clubId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Club',
            required: true,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const joinPrivateEventSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);
export const JoinGroup = mongoose.model('JoinGroup', joinGroupSchema);
export const JoinClub = mongoose.model('JoinClub', joinClubSchema);
export const JoinPrivateEvent = mongoose.model('JoinPrivateEvent', joinPrivateEventSchema);
