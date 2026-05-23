import User from '../models/userModel.js';
import AdminPermissionGroup from '../models/adminPermissionGroupModel.js';
import { ADMIN_PERMISSION_STAR } from '../constants/adminPermissions.js';

/**
 * Admin users (role 0) with no permission groups get full access (`*`) for backward compatibility.
 * Otherwise permissions are the union of all assigned groups.
 */
export async function resolveAdminPermissionSet(userDoc) {
    const set = new Set();
    if (!userDoc || userDoc.role !== 0) {
        return set;
    }

    const ids = userDoc.adminPermissionGroups;
    const hasRefs = Array.isArray(ids) && ids.length > 0;

    if (!hasRefs) {
        set.add(ADMIN_PERMISSION_STAR);
        return set;
    }

    const groups = await AdminPermissionGroup.find({
        _id: { $in: ids },
    })
        .select('permissions')
        .lean();

    for (const g of groups) {
        for (const p of g.permissions || []) {
            set.add(p);
        }
    }

    return set;
}

export async function resolveAdminPermissionSetByUserId(userId) {
    const user = await User.findById(userId).select('role adminPermissionGroups').lean();
    if (!user) return new Set();
    return resolveAdminPermissionSet(user);
}
