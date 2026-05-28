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

// Prevent duplicate follow rows per target while allowing the polymorphic
// schema where only one `following*` field is populated per document.
followSchema.index(
    { follower: 1, followingCoach: 1 },
    {
        unique: true,
        partialFilterExpression: { followingCoach: { $type: 'objectId' } },
    }
);
followSchema.index(
    { follower: 1, followingFacility: 1 },
    {
        unique: true,
        partialFilterExpression: { followingFacility: { $type: 'objectId' } },
    }
);
followSchema.index(
    { follower: 1, followingCompany: 1 },
    {
        unique: true,
        partialFilterExpression: { followingCompany: { $type: 'objectId' } },
    }
);
followSchema.index(
    { follower: 1, followingClub: 1 },
    {
        unique: true,
        partialFilterExpression: { followingClub: { $type: 'objectId' } },
    }
);
followSchema.index(
    { follower: 1, followingClubGroup: 1 },
    {
        unique: true,
        partialFilterExpression: { followingClubGroup: { $type: 'objectId' } },
    }
);

// Reverse lookups (e.g. "who follows this coach")
followSchema.index({ followingCoach: 1, createdAt: -1 });
followSchema.index({ followingFacility: 1, createdAt: -1 });
followSchema.index({ followingCompany: 1, createdAt: -1 });
followSchema.index({ followingClub: 1, createdAt: -1 });
followSchema.index({ followingClubGroup: 1, createdAt: -1 });

export default mongoose.model('Follow', followSchema);
