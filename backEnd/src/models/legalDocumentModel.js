import mongoose from 'mongoose';
import { ALL_CONTRACT_DOC_TYPES } from '../constants/contractDocuments.js';

const legalDocumentSchema = new mongoose.Schema(
    {
        docType: {
            type: String,
            enum: ALL_CONTRACT_DOC_TYPES,
            required: true,
        },
        version: {
            type: Number,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

legalDocumentSchema.index({ docType: 1, version: 1 }, { unique: true });

export default mongoose.model('LegalDocument', legalDocumentSchema);
