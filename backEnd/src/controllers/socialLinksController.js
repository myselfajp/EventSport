// Controller for social media links (footer)
import SocialLinks from '../models/socialLinksModel.js';
import { AppError } from '../utils/appError.js';

// Public endpoint – returns array of links (platform, url)
export const getPublicSocialLinks = async (_req, res, next) => {
  try {
    const doc = await SocialLinks.findOne({ key: 'default' }).lean();
    const links = (doc?.links || []).filter(l => l.url && String(l.url).trim().length > 0);
    res.status(200).json({ success: true, data: links });
  } catch (err) {
    next(err);
  }
};

// Admin endpoint – replace entire list of links
export const updateAdminSocialLinks = async (req, res, next) => {
  try {
    let payload = req.body?.links;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        // ignore
      }
    }
    if (!Array.isArray(payload)) {
      throw new AppError(400, 'Payload must contain a "links" array');
    }
    const allowed = ['linkedin', 'instagram', 'facebook', 'youtube', 'reddit', 'x'];
    const sanitized = [];
    for (const item of payload) {
      if (!allowed.includes(item.platform)) {
        throw new AppError(400, `Invalid platform ${item.platform}`);
      }
      if (typeof item.url !== 'string') {
        throw new AppError(400, 'url must be a string');
      }
      sanitized.push({
        platform: item.platform,
        url: item.url.trim(),
      });
    }

    const doc = await SocialLinks.findOneAndUpdate(
      { key: 'default' },
      { $set: { links: sanitized } },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: doc.links });
  } catch (err) {
    next(err);
  }
};
