import mongoose from 'mongoose';
import { locationSubSchema } from './locationModel.js';

const clubGroupSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            required: true,
        },
        clubId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Club',
            default: null,
        },
        clubName: {
            type: String,
            default: '',
        },
        coaches: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
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
        description: {
            type: String,
        },
        photo: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model('ClubGroup', clubGroupSchema);
