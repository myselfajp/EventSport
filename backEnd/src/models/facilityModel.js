import mongoose from 'mongoose';
import { locationSubSchema } from './locationModel.js';

const facilitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        location: locationSubSchema,
        address: {
            type: String,
            default: '',
        },
        phone: {
            type: String,
            required: true,
        },
        email: {
            type: String,
        },
        photo: {
            path: { type: String, required: true },
            originalName: { type: String, required: true },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true },
        },
        mainSport: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Sport',
        },
        membershipLevel: {
            type: String,
            default: null,
            enum: {
                values: ['Gold', 'Platinum', 'Bronze', 'Silver'],
                message: 'Should be Gold, Platinum, Bronze, Silver',
            },
        },
        private: {
            type: Boolean,
            default: true,
        },
        point: {
            type: Number,
            default: null,
            min: 1,
            max: 10,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Facility', facilitySchema);
