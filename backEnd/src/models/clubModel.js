import mongoose from 'mongoose';
import { locationSubSchema } from './locationModel.js';

const clubSchema = new mongoose.Schema(
    {
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        location: locationSubSchema,
        mainSport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sport',
            default: null,
        },
        photo: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
        },
        vision: {
            type: String,
        },
        conditions: {
            type: String,
        },
        president: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        coaches: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        isApproved: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Club', clubSchema);
