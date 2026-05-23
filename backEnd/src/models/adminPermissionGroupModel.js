import mongoose from 'mongoose';
import { ADMIN_PERMISSION_KEYS } from '../constants/adminPermissions.js';

const adminPermissionGroupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        permissions: {
            type: [String],
            default: [],
            validate: {
                validator(arr) {
                    if (!Array.isArray(arr)) return false;
                    return arr.every((p) => ADMIN_PERMISSION_KEYS.includes(p));
                },
                message: 'Invalid permission key in group.',
            },
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        isSystem: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const AdminPermissionGroup =
    mongoose.models.AdminPermissionGroup ||
    mongoose.model('AdminPermissionGroup', adminPermissionGroupSchema);

export default AdminPermissionGroup;
