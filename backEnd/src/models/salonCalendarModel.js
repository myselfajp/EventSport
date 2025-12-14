import mongoose from 'mongoose';

const salonCalendarSchema = new mongoose.Schema(
    {
        salon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: true,
        },
        isTaken: {
            type: Boolean,
            default: false,
        },
        date: {
            type: Date,
            required: true,
        },
        fromTime: {
            type: Date,
            required: true,
        },
        toTime: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('SalonCalendar', salonCalendarSchema);
