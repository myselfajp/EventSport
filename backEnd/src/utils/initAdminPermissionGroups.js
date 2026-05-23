import AdminPermissionGroup from '../models/adminPermissionGroupModel.js';
import { ADMIN_PERMISSION_STAR } from '../constants/adminPermissions.js';

export async function initAdminPermissionGroups() {
    try {
        const existing = await AdminPermissionGroup.findOne({ slug: 'full-access' });
        if (existing) {
            return;
        }
        await AdminPermissionGroup.create({
            name: 'Tam yetki (sistem)',
            slug: 'full-access',
            permissions: [ADMIN_PERMISSION_STAR],
            description: 'Tüm admin alanları. Yeni kurulumda otomatik oluşturulur.',
            isSystem: true,
        });
        console.log('✅ Default admin permission group "full-access" created');
    } catch (err) {
        console.error('⚠️  initAdminPermissionGroups:', err.message);
    }
}
