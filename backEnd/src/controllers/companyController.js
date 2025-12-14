// companyController.js
import { AppError } from '../utils/appError.js';
import User from '../models/userModel.js';
import Company from '../models/companyModel.js';
import * as zodValidation from '../utils/validation.js';

export const createCompany = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const result = zodValidation.createCompanySchema.parse(req.body);

        result.photo = {
            path: req.fileMeta.path,
            originalName: req.fileMeta.originalName,
            mimeType: req.fileMeta.mimeType,
            size: req.fileMeta.size,
        };

        const newCompany = await Company.create({ ...result });

        await User.findByIdAndUpdate(user._id, {
            $push: { company: newCompany._id },
        });

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: newCompany,
        });
    } catch (err) {
        next(err);
    }
};

export const editCompany = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const companyId = zodValidation.mongoObjectId.parse(req.params.companyId);
        const result = zodValidation.editCompanySchema.parse(req.body);

        if (Object.keys(result).length === 0 && !req.fileMeta)
            throw new AppError(400, 'At least one field must be provided.');

        const companyExists = await Company.exists({ _id: companyId });
        if (!companyExists) throw new AppError(404, 'Company not found');

        const isOwner = user.company?.some((c) => c.equals(companyId));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this company');
        }

        if (req.fileMeta) {
            result.photo = {
                path: req.fileMeta.path,
                originalName: req.fileMeta.originalName,
                mimeType: req.fileMeta.mimeType,
                size: req.fileMeta.size,
            };
        }

        const updatedCompany = await Company.findByIdAndUpdate(
            companyId,
            { $set: result },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Company updated successfully',
            data: updatedCompany,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteCompany = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const companyId = zodValidation.mongoObjectId.parse(req.params.companyId);

        const companyExists = await Company.exists({ _id: companyId });
        if (!companyExists) throw new AppError(404, 'Company not found');

        // Check if user is owner of company
        const isOwner = user.company?.some((c) => c.equals(companyId));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this company');
        }

        await Company.findByIdAndDelete(companyId);

        // Remove company from user's company array
        await User.findByIdAndUpdate(user._id, {
            $pull: { company: companyId },
        });

        res.status(204).json({
            success: true,
            message: 'Company deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

// export const getCompany = async (req, res, next) => {
//     try {
//         const companyId = zodValidation.mongoObjectId.parse(req.params.companyId);

//         const company = await Company.findById(companyId);
//         if (!company) throw new AppError(404, 'Company not found');

//         res.status(200).json({
//             success: true,
//             data: company,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// export const getAllCompanies = async (req, res, next) => {
//     try {
//         const companies = await Company.find();

//         res.status(200).json({
//             success: true,
//             count: companies.length,
//             data: companies,
//         });
//     } catch (err) {
//         next(err);
//     }
// };
