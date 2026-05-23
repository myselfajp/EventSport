import mongoose from 'mongoose';

/** Istanbul ilçe (and future region-specific areas). */
const districtSchema = new mongoose.Schema(
    {
        region: {
            type: String,
            required: true,
            default: 'istanbul',
            index: true,
        },
        name: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);
districtSchema.index({ region: 1, name: 1 }, { unique: true });

export const District = mongoose.model('District', districtSchema);

/** Stored on Facility, Company, Club, User, etc. */
export const locationSubSchema = {
    district: { type: mongoose.Schema.Types.ObjectId, ref: 'District' },
    addressLine: { type: String, trim: true },
};
