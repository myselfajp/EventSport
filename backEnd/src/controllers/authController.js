import User from '../models/userModel.js';
import Participant from '../models/participantModel.js';
import Coach from '../models/coachModel.js';
import LegalDocument from '../models/legalDocumentModel.js';
import { Types } from 'mongoose';
import argon2 from 'argon2';
import {
    SearchQuerySchema,
    loginSchema,
    signupSchema,
    editUserSchema,
} from '../utils/validation.js';
import { AppError } from '../utils/appError.js';
import { generateTokens, sendTokens } from '../utils/jwtHelper.js';
import { checkAccountLockout, handleFailedLogin, handleSuccessfulLogin } from '../middleware/accountLockout.js';
import { checkPasswordStrength } from '../utils/passwordStrength.js';

export const signUp = async (req, res, next) => {
    try {
        if (req.user) {
            return res.status(200).json({ success: false, message: 'Already logged in' });
        }
        const body = req.body || {};
        if (body.age) {
            body.age = new Date(body.age);
        }

        const result = signupSchema.parse(body);

        const passwordCheck = checkPasswordStrength(result.password);
        if (!passwordCheck.valid) {
            throw new AppError(400, passwordCheck.message);
        }

        const termsDoc = await LegalDocument.findById(result.termsVersionId).lean();
        if (!termsDoc || termsDoc.docType !== 'terms' || !termsDoc.isActive) {
            throw new AppError(400, 'Invalid or inactive Terms & Conditions version.');
        }
        const kvkkDoc = await LegalDocument.findById(result.kvkkVersionId).lean();
        if (!kvkkDoc || kvkkDoc.docType !== 'kvkk' || !kvkkDoc.isActive) {
            throw new AppError(400, 'Invalid or inactive KVKK version.');
        }

        const email = result.email;
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new AppError(409, 'Email already registered');

        const hashedPassword = await argon2.hash(result.password);
        const { password, agreeTerms, agreeKvkk, termsVersionId, kvkkVersionId, ...userData } = result;

        const user = await User.create({
            ...userData,
            password: hashedPassword,
            termsAccepted: {
                versionId: new Types.ObjectId(termsVersionId),
                acceptedAt: new Date(),
            },
            kvkkConsent: {
                agreed: true,
                versionId: new Types.ObjectId(kvkkVersionId),
                consentedAt: new Date(),
            },
        });

        const { password: pass, ...userWithoutPassword } = user.toObject();

        const tokens = await generateTokens(user.id);
        sendTokens(res, tokens);

        res.status(201).json({
            success: true,
            message: 'Signed up successfully',
            data: userWithoutPassword,
        });
    } catch (err) {
        next(err);
    }
};

export const signIn = async (req, res, next) => {
    try {
        if (req.user) {
            return res.status(200).json({ success: false, message: 'Already logged in' });
        }

        const result = loginSchema.parse({
            email: req.body?.email,
            password: req.body?.password,
        });

        await checkAccountLockout(result.email);

        const getUser = await User.findOne({
            email: result.email,
        }).select('+password');

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';

        if (!getUser || !(await argon2.verify(getUser.password, result.password))) {
            if (getUser) {
                await handleFailedLogin(getUser);
            }
            throw new AppError(401, 'Invalid email or password');
        }

        await handleSuccessfulLogin(getUser, ipAddress);

        const { password, ...user } = getUser.toObject();

        const tokens = await generateTokens(user._id);

        sendTokens(res, tokens);

        res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

export const signOut = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(403);
        }

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

export const getUser = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        if (req.method === 'GET') {
            const getUser = await User.findById(req.params.userId).populate([
                {
                    path: 'participant',
                },
                { path: 'coach' },
                { path: 'facility' },
                { path: 'company' },
            ]);
            if (!getUser) throw new AppError(404);

            return res.status(200).json({
                success: true,
                data: getUser,
            });
        }

        const { perPage, pageNumber, search, mainSport, sport } = SearchQuerySchema.parse({
            perPage: req.body?.perPage,
            pageNumber: req.body?.pageNumber,
            search: req.body?.search,
            mainSport: req.body?.mainSport,
            sport: req.body?.sport,
        });

        const pipeline = [];

        // Add search match for firstName/lastName if search is provided
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                    ],
                },
            });
        }

        // Handle sport filter - lookup branches and match sport field
        if (sport) {
            pipeline.push(
                {
                    $lookup: {
                        from: 'branches',
                        localField: 'coach',
                        foreignField: 'coach',
                        as: 'branchData',
                    },
                },
                {
                    $match: {
                        'branchData.sport': new Types.ObjectId(sport),
                    },
                }
            );
        }

        // Handle mainSport filter - lookup participants and match mainSport field
        if (mainSport) {
            pipeline.push(
                {
                    $lookup: {
                        from: 'participants',
                        localField: 'participant',
                        foreignField: '_id',
                        as: 'participantData',
                    },
                },
                {
                    $match: {
                        'participantData.mainSport': new Types.ObjectId(mainSport),
                    },
                }
            );
        }

        pipeline.push({
            $project: {
                password: 0,
                role: 0,
                failedLoginAttempts: 0,
                accountLockedUntil: 0,
            },
        });

        // Add facet for both data and count
        pipeline.push({
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: (pageNumber - 1) * perPage }, { $limit: perPage }],
            },
        });

        const result = await User.aggregate(pipeline);

        const users = result[0].data;
        const total = result[0].metadata[0]?.total || 0;
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

export const getCurrentUser = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const user = await User.findById(req.user._id).select('-__v');
        if (!user) throw new AppError(404);

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

export const editUser = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        let PasswordChanged = false;
        const body = req.body || {};
        if (body.age) {
            body.age = new Date(body.age);
        }

        // Add deletePhoto to body if it exists
        if (req.body.deletePhoto) {
            body.deletePhoto = req.body.deletePhoto;
        }

        // Add photo to body if file is being uploaded (for validation)
        if (req.fileMeta) {
            body.photo = 'uploaded'; // Just a marker for validation
        }

        const result = editUserSchema.parse(body);

        // Handle photo upload if file is provided
        if (req.fileMeta) {
            result.photo = {
                path: req.fileMeta.path,
                originalName: req.fileMeta.originalName,
                mimeType: req.fileMeta.mimeType,
                size: req.fileMeta.size,
            };
        } else if (result.deletePhoto === 'true') {
            // If deletePhoto flag is set, remove photo
            result.photo = null;
        }
        
        // Remove deletePhoto from result (it's only for validation)
        delete result.deletePhoto;

        if (result.oldPassword || result.newPassword) {
            if (!result.oldPassword) {
                throw new AppError(400, 'Old password and must be provided.');
            }
            if (!result.newPassword) {
                throw new AppError(400, 'New password and must be provided.');
            }

            const passwordCheck = checkPasswordStrength(result.newPassword);
            if (!passwordCheck.valid) {
                throw new AppError(400, passwordCheck.message);
            }

            const user = await User.findById(req.user._id).select('+password');
            if (!user || !(await argon2.verify(user.password, result.oldPassword))) {
                throw new AppError(401, 'Wrong password.');
            }

            result.password = await argon2.hash(result.newPassword);
            PasswordChanged = true;
            delete result.oldPassword;
            delete result.newPassword;
        }

        const editUser = await User.findByIdAndUpdate(req.user._id, { ...result }, { new: true });

        if (!editUser) throw new AppError(404);

        // Update Coach name if user has coach and name changed
        if (editUser.coach && (result.firstName || result.lastName)) {
            const newName = `${editUser.firstName} ${editUser.lastName}`;
            await Coach.findByIdAndUpdate(editUser.coach, { name: newName });
        }

        // Update Participant name if user has participant and name changed
        if (editUser.participant && (result.firstName || result.lastName)) {
            const newName = `${editUser.firstName} ${editUser.lastName}`;
            await Participant.findByIdAndUpdate(editUser.participant, { name: newName });
        }

        if (PasswordChanged) {
        }
        res.status(200).json({
            success: true,
            message: PasswordChanged ? 'Password changed successfully' : 'Data updated',
            data: editUser,
        });
    } catch (err) {
        next(err);
    }
};

