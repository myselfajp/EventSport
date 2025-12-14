import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
    {
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant',
            required: true,
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        isCancelled: {
            type: Boolean,
            default: false,
        },
        isPaid: {
            type: Boolean,
            default: false,
        },
        isCheckedIn: {
            type: Boolean,
            default: false,
        },
        isWaitListed: {
            type: Boolean,
            default: false,
        },
        checkInDeadline: {
            type: Date,
            required: true,
        },
        qr: {
            type: String,
        },
        isJoined: {
            type: Boolean,
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Reservation', reservationSchema);
