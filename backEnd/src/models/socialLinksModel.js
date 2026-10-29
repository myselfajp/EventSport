// Social Links model for footer
import mongoose from 'mongoose';

const socialLinkSchema = new mongoose.Schema({
  platform: { type: String, enum: ['linkedin','instagram','facebook','youtube','reddit','x'], required: true },
  url: { type: String, trim: true, maxlength: 500, default: '' },
}, { _id: false });

const socialLinksModelSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true, immutable: true },
  links: { type: [socialLinkSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('SocialLinks', socialLinksModelSchema);
