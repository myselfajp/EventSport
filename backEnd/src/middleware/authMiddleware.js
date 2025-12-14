import { AppError } from '../utils/appError.js';
import User from '../models/userModel.js';
import { verifyAccessToken } from '../utils/jwtHelper.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];

        if (!accessToken) {
            req.user = null;
            return next();
        }

        try {
            // Try to verify access token first
            const decoded = verifyAccessToken(accessToken);
            const user = await User.findById(decoded.userId);

            if (!user) {
                throw new AppError(404, 'User not found');
            }

            req.user = user;
            return next();
        } catch (accessTokenErr) {
            if (accessTokenErr.message === 'Access token expired') {
                return res.status(401).json({
                    success: false,
                    message: 'Access token expired',
                });
            }

            req.user = null;
            return next();
        }
    } catch (err) {
        next(err);
    }
};
