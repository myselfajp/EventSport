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
    'admin.notifications',
    'admin.legal',
    'admin.contract_acceptances',
    'admin.static_pages',
    'admin.dashboard_hero',
    'admin.suggestions',
    'admin.reports',
];

export const ADMIN_PERMISSION_LABELS = {
    [ADMIN_PERMISSION_STAR]: 'Tam yetki',
    'admin.users': 'Kullanıcılar',
    'admin.blacklist': 'Blacklist',
    'admin.coaches': 'Koç sertifikaları',
    'admin.enums': 'Enum / referans veri',
    'admin.events': 'Etkinlikler',
    'admin.notifications': 'Bildirimler',
    'admin.legal': 'Yasal metinler',
    'admin.contract_acceptances': 'Sözleşme kabul kayıtları',
    'admin.static_pages': 'Statik sayfalar',
    'admin.dashboard_hero': 'Ana sayfa hero',
    'admin.suggestions': 'Öneriler',
    'admin.reports': 'Reports',
};

export function isValidAdminPermissionKey(key) {
    return typeof key === 'string' && ADMIN_PERMISSION_KEYS.includes(key);
}
