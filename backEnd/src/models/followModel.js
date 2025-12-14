import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
    {
        follower: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        followingCoach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            default: null,
        },
        followingCompany: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            default: null,
        },
        followingClub: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Club',
            default: null,
        },
        followingFacility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            default: null,
        },
        followingClubGroup: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ClubGroup',
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Follow', followSchema);
