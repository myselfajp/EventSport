import { AppError } from '../utils/appError.js';
import User from '../models/userModel.js';
import { resolveAdminPermissionSet } from '../utils/resolveAdminPermissions.js';

export const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401, 'Authentication required');
        }

        if (req.user.role !== 0) {
            throw new AppError(403, 'Admin access required');
        }

        const fresh = await User.findById(req.user._id).select('role adminPermissionGroups isActive');
        if (!fresh) {
            throw new AppError(404, 'User not found');
        }
        if (fresh.isActive === false) {
            throw new AppError(403, 'Hesabınız pasif edilmiştir.');
        }

        req.adminPermissions = await resolveAdminPermissionSet(fresh);
        next();
    } catch (err) {
        next(err);
    }
};
