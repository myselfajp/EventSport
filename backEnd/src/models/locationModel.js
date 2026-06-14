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
    country: { type: String, trim: true, uppercase: true, maxlength: 2 },
    state: { type: String, trim: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 120 },
    district: { type: mongoose.Schema.Types.ObjectId, ref: 'District' },
    districtName: { type: String, trim: true, maxlength: 120 },
    postalCode: { type: String, trim: true, maxlength: 24 },
    addressLine: { type: String, trim: true },
    /** Country-agnostic locality key for nearby matching, e.g. `tr:van:edremit`. */
    locationKey: { type: String, trim: true, maxlength: 160, index: true },
};
