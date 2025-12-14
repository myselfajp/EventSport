import mongoose from 'mongoose';

const salonSchema = new mongoose.Schema(
    {
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            required: true,
        },
        name: {
            type: String,
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
        priceInfo: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Salon', salonSchema);
