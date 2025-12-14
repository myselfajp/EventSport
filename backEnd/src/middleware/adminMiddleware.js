import { AppError } from '../utils/appError.js';

export const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401, 'Authentication required');
        }

        if (req.user.role !== 0) {
            throw new AppError(403, 'Admin access required');
        }

        next();
    } catch (err) {
        next(err);
    }
};

