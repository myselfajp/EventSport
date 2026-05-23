import { AppError } from '../utils/appError.js';
import { ADMIN_PERMISSION_STAR } from '../constants/adminPermissions.js';

/**
 * At least one of the listed permissions, or `*` (full admin).
 */
export const requireAdminPermission =
    (...requiredKeys) =>
    (req, res, next) => {
        try {
            const perms = req.adminPermissions;
            if (!perms || !(perms instanceof Set)) {
                throw new AppError(403, 'Admin permissions not loaded');
            }
            if (perms.has(ADMIN_PERMISSION_STAR)) {
                return next();
            }
            const ok = requiredKeys.some((k) => perms.has(k));
            if (!ok) {
                throw new AppError(403, 'Bu işlem için yetkiniz yok.');
            }
            next();
        } catch (err) {
            next(err);
        }
    };

export const requireFullAdmin = (req, res, next) => {
    try {
        const perms = req.adminPermissions;
        if (!perms || !perms.has(ADMIN_PERMISSION_STAR)) {
            throw new AppError(403, 'Bu işlem yalnızca tam yetkili yöneticiler içindir.');
        }
        next();
    } catch (err) {
        next(err);
    }
};
