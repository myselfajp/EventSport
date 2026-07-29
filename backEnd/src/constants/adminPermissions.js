/**
 * Admin panel permission slugs. `*` means unrestricted (via permission group).
 * Some keys are UI-only (routes live outside /api/v1/admin).
 */
export const ADMIN_PERMISSION_STAR = '*';

export const ADMIN_PERMISSION_KEYS = [
    ADMIN_PERMISSION_STAR,
    'admin.users',
    'admin.blacklist',
    'admin.coaches',
    'admin.enums',
    'admin.events',
    'admin.blogs',
    'admin.news',
    'admin.videos',
    'admin.notifications',
    'admin.legal',
    'admin.contract_acceptances',
    'admin.static_pages',
    'admin.subscription_plans',
    'admin.dashboard_hero',
    'admin.suggestions',
    'admin.reports',
];

export const ADMIN_PERMISSION_LABELS = {
    [ADMIN_PERMISSION_STAR]: 'Full access',
    'admin.users': 'Users',
    'admin.blacklist': 'Blacklist',
    'admin.coaches': 'Coach certificates',
    'admin.enums': 'Enum / reference data',
    'admin.events': 'Events',
    'admin.blogs': 'Blogs',
    'admin.news': 'News',
    'admin.videos': 'Videos',
    'admin.notifications': 'Notifications',
    'admin.legal': 'Legal documents',
    'admin.contract_acceptances': 'Contract acceptance log',
    'admin.static_pages': 'Static pages',
    'admin.subscription_plans': 'Subscription plans',
    'admin.dashboard_hero': 'Homepage hero',
    'admin.suggestions': 'Suggestions',
    'admin.reports': 'Reports',
};

export function isValidAdminPermissionKey(key) {
    return typeof key === 'string' && ADMIN_PERMISSION_KEYS.includes(key);
}
