import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: true,
            maxlength: 4000,
        },
        email: {
            type: String,
            maxlength: 320,
            default: undefined,
        },
        contactName: {
            type: String,
            maxlength: 120,
            default: undefined,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Suggestion', suggestionSchema);
