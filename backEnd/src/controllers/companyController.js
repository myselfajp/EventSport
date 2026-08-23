// companyController.js
import { AppError } from '../utils/appError.js';
import User from '../models/userModel.js';
import Company from '../models/companyModel.js';
import * as zodValidation from '../utils/validation.js';
import { Sport } from '../models/referenceDataModel.js';
import { mergeLocationIntoPayload } from '../utils/entityLocation.js';
import { writeAuditLog, changedKeys, auditRoleForUser } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';

export const createCompany = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const result = zodValidation.createCompanySchema.parse(req.body);

        if (req.fileMeta) {
            result.photo = {
                path: req.fileMeta.path,
                originalName: req.fileMeta.originalName,
                mimeType: req.fileMeta.mimeType,
                size: req.fileMeta.size,
            };
        }

        if (result.mainSport) {
            const sportExists = await Sport.exists({ _id: result.mainSport });
            if (!sportExists) throw new AppError(404, 'MainSport not found');
        }
        const companyPayload = await mergeLocationIntoPayload(result);
        const newCompany = await Company.create(companyPayload);

        await User.findByIdAndUpdate(user._id, {
            $push: { company: newCompany._id },
        });

        await writeAuditLog({
            req,
            actorRole: auditRoleForUser(user),
            action: AUDIT_ACTIONS.COMPANY_CREATED,
            entityType: 'company',
            entityId: newCompany._id,
            after: newCompany,
            description: `Company created: ${newCompany.name || ''}`,
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

        const companyExists = await Company.findById(companyId);
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

        if (result.mainSport) {
            const sportExists = await Sport.exists({ _id: result.mainSport });
            if (!sportExists) throw new AppError(404, 'MainSport not found');
        }
        const updatePayload = await mergeLocationIntoPayload(result);
        const updatedCompany = await Company.findByIdAndUpdate(
            companyId,
            { $set: updatePayload },
            { new: true }
        );

        await writeAuditLog({
            req,
            actorRole: auditRoleForUser(user),
            action: AUDIT_ACTIONS.COMPANY_UPDATED,
            entityType: 'company',
            entityId: updatedCompany._id,
            changedFields: changedKeys(companyExists, updatedCompany, Object.keys(updatePayload)),
            before: companyExists,
            after: updatedCompany,
            description: `Company updated: ${updatedCompany.name || ''}`,
        });
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

        const companyExists = await Company.findById(companyId);
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

        await writeAuditLog({
            req,
            actorRole: auditRoleForUser(user),
            action: AUDIT_ACTIONS.COMPANY_DELETED,
            entityType: 'company',
            entityId: companyExists._id,
            before: companyExists,
            description: `Company deleted: ${companyExists.name || ''}`,
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
