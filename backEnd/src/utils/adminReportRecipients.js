import User from '../models/userModel.js';
import { resolveAdminPermissionSet } from './resolveAdminPermissions.js';
import { ADMIN_PERMISSION_STAR } from '../constants/adminPermissions.js';

/** Active admin user IDs that can access the Reports moderation queue. */
export async function getAdminUserIdsWithReportsAccess() {
    const admins = await User.find({
        role: { $in: [0, '0'] },
        isActive: { $ne: false },
    })
        .select('_id role adminPermissionGroups')
        .lean();

    const ids = [];
    for (const admin of admins) {
        const perms = await resolveAdminPermissionSet(admin);
        if (perms.has(ADMIN_PERMISSION_STAR) || perms.has('admin.reports')) {
            ids.push(String(admin._id));
        }
    }
    return [...new Set(ids)];
}
