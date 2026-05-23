import AdminPermissionGroup from '../models/adminPermissionGroupModel.js';
import User from '../models/userModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import { ADMIN_PERMISSION_KEYS, ADMIN_PERMISSION_LABELS, isValidAdminPermissionKey } from '../constants/adminPermissions.js';

export const listPermissionGroups = async (req, res, next) => {
    try {
        const groups = await AdminPermissionGroup.find().sort({ name: 1 }).lean();
        res.status(200).json({ success: true, data: groups });
    } catch (err) {
        next(err);
    }
};

export const createPermissionGroup = async (req, res, next) => {
    try {
        const { name, slug, permissions, description } = req.body || {};
        if (!name || typeof name !== 'string') {
            throw new AppError(400, 'name is required');
        }
        if (!slug || typeof slug !== 'string') {
            throw new AppError(400, 'slug is required');
        }
        if (!Array.isArray(permissions) || permissions.length === 0) {
            throw new AppError(400, 'permissions must be a non-empty array');
        }
        for (const p of permissions) {
            if (!isValidAdminPermissionKey(p)) {
                throw new AppError(400, `Invalid permission: ${p}`);
            }
        }

        const group = await AdminPermissionGroup.create({
            name: name.trim(),
            slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
            permissions,
            description: typeof description === 'string' ? description.trim() : '',
            isSystem: false,
        });

        res.status(201).json({ success: true, data: group });
    } catch (err) {
        if (err.code === 11000) {
            return next(new AppError(409, 'Bu slug zaten kullanılıyor.'));
        }
        next(err);
    }
};

export const updatePermissionGroup = async (req, res, next) => {
    try {
        const id = mongoObjectId.parse(req.params.groupId);
        const group = await AdminPermissionGroup.findById(id);
        if (!group) {
            throw new AppError(404, 'Grup bulunamadı');
        }
        if (group.isSystem) {
            throw new AppError(403, 'Sistem grubu düzenlenemez');
        }

        const { name, slug, permissions, description } = req.body || {};
        if (name !== undefined) group.name = String(name).trim();
        if (slug !== undefined) group.slug = String(slug).trim().toLowerCase().replace(/\s+/g, '-');
        if (description !== undefined) group.description = String(description).trim();
        if (permissions !== undefined) {
            if (!Array.isArray(permissions) || permissions.length === 0) {
                throw new AppError(400, 'permissions must be a non-empty array');
            }
            for (const p of permissions) {
                if (!isValidAdminPermissionKey(p)) {
                    throw new AppError(400, `Invalid permission: ${p}`);
                }
            }
            group.permissions = permissions;
        }

        await group.save();
        res.status(200).json({ success: true, data: group });
    } catch (err) {
        if (err.code === 11000) {
            return next(new AppError(409, 'Bu slug zaten kullanılıyor.'));
        }
        next(err);
    }
};

export const deletePermissionGroup = async (req, res, next) => {
    try {
        const id = mongoObjectId.parse(req.params.groupId);
        const group = await AdminPermissionGroup.findById(id);
        if (!group) {
            throw new AppError(404, 'Grup bulunamadı');
        }
        if (group.isSystem) {
            throw new AppError(403, 'Sistem grubu silinemez');
        }

        await User.updateMany({ adminPermissionGroups: id }, { $pull: { adminPermissionGroups: id } });

        await AdminPermissionGroup.deleteOne({ _id: id });
        res.status(200).json({ success: true, message: 'Grup silindi' });
    } catch (err) {
        next(err);
    }
};

export const getPermissionCatalog = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: ADMIN_PERMISSION_KEYS.map((key) => ({
                key,
                label: ADMIN_PERMISSION_LABELS[key] || key,
            })),
        });
    } catch (err) {
        next(err);
    }
};
