import mongoose from 'mongoose';
import { locationSubSchema } from './locationModel.js';

const companySchema = new mongoose.Schema(
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
        mainSport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sport',
            default: null,
        },
        phone: {
            type: String,
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
        companyType: {
            type: String,
            required: true,
            enum: {
                values: ['sponsor', 'sport'],
                message: 'Company type must be sponsor or sport',
            },
            default: 'sport',
        },
    },
    { timestamps: true }
);

export default mongoose.model('Company', companySchema);
