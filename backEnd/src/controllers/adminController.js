import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
import Branch from '../models/branchModel.js';
import { AppError } from '../utils/appError.js';
import { SearchQuerySchema, mongoObjectId, signupSchema, editUserSchema } from '../utils/validation.js';
import argon2 from 'argon2';
import { checkPasswordStrength } from '../utils/passwordStrength.js';

export const getAdminPanel = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Admin panel access granted',
            data: {
                user: {
                    id: req.user._id,
                    email: req.user.email,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

// User Management
export const getAllUsers = async (req, res, next) => {
    try {
        const { perPage, pageNumber, search } = SearchQuerySchema.parse({
            perPage: req.body?.perPage || req.query?.perPage,
            pageNumber: req.body?.pageNumber || req.query?.pageNumber,
            search: req.body?.search || req.query?.search,
        });

        const query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await User.find(query)
            .select('-password -refreshTokens -activityLog -failedLoginAttempts -accountLockedUntil')
            .populate('participant', 'name mainSport skillLevel')
            .populate('coach', 'name isVerified')
            .skip((pageNumber - 1) * perPage)
            .limit(perPage)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            data: users,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const createUser = async (req, res, next) => {
    try {
        const body = req.body || {};
        if (body.age) {
            body.age = new Date(body.age);
        }

        const result = signupSchema.parse(body);

        const passwordCheck = checkPasswordStrength(result.password);
        if (!passwordCheck.valid) {
            throw new AppError(400, passwordCheck.message);
        }

        const existingUser = await User.findOne({ email: result.email });
        if (existingUser) {
            throw new AppError(409, 'Email already registered');
        }

        const hashedPassword = await argon2.hash(result.password);
        const { password, ...userData } = result;

        const user = await User.create({
            ...userData,
            password: hashedPassword,
        });

        const { password: pass, ...userWithoutPassword } = user.toObject();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userWithoutPassword,
        });
    } catch (err) {
        next(err);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const body = req.body || {};

        if (body.age) {
            body.age = new Date(body.age);
        }

        const updateData = { ...body };
        let passwordHash = null;

        if (updateData.newPassword) {
            const passwordCheck = checkPasswordStrength(updateData.newPassword);
            if (!passwordCheck.valid) {
                throw new AppError(400, passwordCheck.message);
            }

            passwordHash = await argon2.hash(updateData.newPassword);
            delete updateData.newPassword;
        }
        delete updateData.oldPassword;

        if (updateData.email) {
            const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
            if (existingUser) {
                throw new AppError(409, 'Email already in use');
            }
        }

        const result = editUserSchema.parse(updateData);

        if (passwordHash) {
            result.password = passwordHash;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, result, { new: true })
            .select('-password -refreshTokens -activityLog -failedLoginAttempts -accountLockedUntil');

        if (!updatedUser) {
            throw new AppError(404, 'User not found');
        }

        if (updatedUser.coach && (result.firstName || result.lastName)) {
            const newName = `${updatedUser.firstName} ${updatedUser.lastName}`;
            await Coach.findByIdAndUpdate(updatedUser.coach, { name: newName });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);

        if (userId.toString() === req.user._id.toString()) {
            throw new AppError(400, 'Cannot delete your own account');
        }

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            throw new AppError(404, 'User not found');
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

// Coach Certificate Approval
export const getPendingCoaches = async (req, res, next) => {
    try {
        const { perPage, pageNumber, search } = SearchQuerySchema.parse({
            perPage: req.body?.perPage || req.query?.perPage,
            pageNumber: req.body?.pageNumber || req.query?.pageNumber,
            search: req.body?.search || req.query?.search,
        });

        const branches = await Branch.find({ status: 'Pending' })
            .populate({
                path: 'coach',
                select: 'name isVerified',
            })
            .populate('sport', 'name groupName')
            .sort({ createdAt: -1 })
            .lean();

        let filteredBranches = branches;

        if (search) {
            const searchLower = search.toLowerCase();
            filteredBranches = branches.filter((branch) => {
                const coachName = branch.coach?.name || '';
                const sportName = branch.sport?.name || '';
                return coachName.toLowerCase().includes(searchLower) || sportName.toLowerCase().includes(searchLower);
            });
        }

        const total = filteredBranches.length;
        const paginatedBranches = filteredBranches.slice((pageNumber - 1) * perPage, pageNumber * perPage);

        const branchesWithUser = await Promise.all(
            paginatedBranches.map(async (branch) => {
                const user = await User.findOne({ coach: branch.coach._id }).select('firstName lastName email phone photo').lean();
                return {
                    ...branch,
                    user,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: branchesWithUser,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const approveCertificate = async (req, res, next) => {
    try {
        const branchId = mongoObjectId.parse(req.params.branchId);

        const branch = await Branch.findByIdAndUpdate(
            branchId,
            { status: 'Approved' },
            { new: true }
        ).populate('coach');

        if (!branch) {
            throw new AppError(404, 'Branch not found');
        }

        if (branch.status === 'Approved') {
            const coach = await Coach.findById(branch.coach._id);
            if (coach && !coach.isVerified) {
                const allBranches = await Branch.find({ coach: coach._id });
                const allApproved = allBranches.every((b) => b.status === 'Approved');
                if (allApproved) {
                    await Coach.findByIdAndUpdate(coach._id, { isVerified: true });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Certificate approved successfully',
            data: branch,
        });
    } catch (err) {
        next(err);
    }
};

export const rejectCertificate = async (req, res, next) => {
    try {
        const branchId = mongoObjectId.parse(req.params.branchId);

        const branch = await Branch.findByIdAndUpdate(
            branchId,
            { status: 'Rejected' },
            { new: true }
        );

        if (!branch) {
            throw new AppError(404, 'Branch not found');
        }

        res.status(200).json({
            success: true,
            message: 'Certificate rejected successfully',
            data: branch,
        });
    } catch (err) {
        next(err);
    }
};
