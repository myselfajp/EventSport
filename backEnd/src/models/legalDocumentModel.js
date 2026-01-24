import mongoose from 'mongoose';

const legalDocumentSchema = new mongoose.Schema(
    {
        docType: {
            type: String,
            enum: ['kvkk', 'terms'],
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
