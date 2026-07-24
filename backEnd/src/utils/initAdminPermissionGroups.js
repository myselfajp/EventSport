import AdminPermissionGroup from '../models/adminPermissionGroupModel.js';
import { ADMIN_PERMISSION_STAR } from '../constants/adminPermissions.js';

export async function initAdminPermissionGroups() {
    try {
        const existing = await AdminPermissionGroup.findOne({ slug: 'full-access' });
        if (existing) {
            return;
        }
        await AdminPermissionGroup.create({
            name: 'Full access (system)',
            slug: 'full-access',
            permissions: [ADMIN_PERMISSION_STAR],
            description: 'All admin areas. Created automatically on fresh installs.',
            isSystem: true,
        });
        console.log('✅ Default admin permission group "full-access" created');
    } catch (err) {
        console.error('⚠️  initAdminPermissionGroups:', err.message);
    }
}
