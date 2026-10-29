import mongoose from 'mongoose';

const registrationConsentItemSchema = new mongoose.Schema(
    {
        checkboxLabel: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        docTypes: {
            type: [String],
            required: true,
            validate: {
                validator(value) {
                    return Array.isArray(value) && value.length > 0;
                },
                message: 'At least one contract type is required.',
            },
        },
        required: {
            type: Boolean,
            default: true,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

registrationConsentItemSchema.index({ sortOrder: 1, createdAt: 1 });

export default mongoose.model('RegistrationConsentItem', registrationConsentItemSchema);
