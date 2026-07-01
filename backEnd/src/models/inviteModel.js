import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema(
    {
        inviter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            required: true,
        },
        invitee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ClubGroup',
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
        },
    },
    { timestamps: true }
);

inviteSchema.index({ invitee: 1, event: 1 });
inviteSchema.index({ invitee: 1, group: 1 });

export default mongoose.model('Invite', inviteSchema);
