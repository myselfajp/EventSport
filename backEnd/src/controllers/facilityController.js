import { AppError } from '../utils/appError.js';
import User from '../models/userModel.js';
import Salon from '../models/salonModel.js';
import Facility from '../models/facilityModel.js';
import SalonCalendar from '../models/salonCalendarModel.js';
import { Sport, SportGroup } from '../models/referenceDataModel.js';
import * as zodValidation from '../utils/validation.js';

export const createFacility = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const result = zodValidation.createFacilitySchema.parse(req.body);
        const sportExists = await Sport.exists({ _id: result.mainSport });
        if (!sportExists) throw new AppError(404, 'MainSport not found');

        result.photo = {
            path: req.fileMeta.path,
            originalName: req.fileMeta.originalName,
            mimeType: req.fileMeta.mimeType,
            size: req.fileMeta.size,
        };
        const newFacility = await Facility.create({ ...result });

        // Add facility to user's facility array
        await User.findByIdAndUpdate(user._id, {
            $push: { facility: newFacility._id },
        });

        res.status(201).json({
            success: true,
            message: 'Facility created successfully',
            data: newFacility,
        });
    } catch (err) {
        next(err);
    }
};

export const editFacility = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const facilityId = zodValidation.mongoObjectId.parse(req.params.facilityId);
        const result = zodValidation.editFacilitySchema.parse(req.body);
        if (Object.keys(result).length === 0 && !req.fileMeta)
            throw new AppError(400, 'At least one field must be provided.');

        const facilityExists = await Facility.exists({ _id: facilityId });
        if (!facilityExists) throw new AppError(404, 'Facility not found');

        if (result.mainSport) {
            const sportExists = await Sport.exists({ _id: result.mainSport });
            if (!sportExists) throw new AppError(404, 'MainSport not found');
        }

        // Check if user is owner of facility
        const isOwner = user.facility?.some((f) => f.equals(facilityId));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this facility');
        }

        // Handle photo if provided
        if (req.fileMeta) {
            result.photo = {
                path: req.fileMeta.path,
                originalName: req.fileMeta.originalName,
                mimeType: req.fileMeta.mimeType,
                size: req.fileMeta.size,
            };
        }

        const updatedFacility = await Facility.findByIdAndUpdate(
            facilityId,
            { $set: result },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Facility updated successfully',
            data: updatedFacility,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteFacility = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const facilityId = zodValidation.mongoObjectId.parse(req.params.facilityId);

        const facilityExists = await Facility.exists({ _id: facilityId });
        if (!facilityExists) throw new AppError(404, 'Facility not found');

        // Check if user is owner of facility
        const isOwner = user.facility?.some((f) => f.equals(facilityId));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this facility');
        }

        await Facility.findByIdAndDelete(facilityId);

        // Remove facility from user's facility array
        await User.findByIdAndUpdate(user._id, {
            $pull: { facility: facilityId },
        });

        res.status(204).json({
            success: true,
            message: 'Facility deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const addSalon = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const result = zodValidation.createSalonSchema.parse(req.body);

        const facilityExists = await Facility.exists({ _id: result.facilityId });
        if (!facilityExists) throw new AppError(404, 'Facility not found');

        const sportExists = await Sport.exists({ _id: result.sport });
        if (!sportExists) throw new AppError(404, 'Sport not found');

        const sportGroupExists = await SportGroup.exists({ _id: result.sportGroup });
        if (!sportGroupExists) throw new AppError(404, 'SportGroup not found');

        // Check if user is owner of facility
        const isOwner = user.facility?.some((f) => f.equals(result.facilityId));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this facility');
        }

        const newSalon = await Salon.create({
            ...result,
            facility: result.facilityId,
        });

        res.status(201).json({
            success: true,
            message: 'Salon created successfully',
            data: newSalon,
        });
    } catch (err) {
        next(err);
    }
};

export const editSalon = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const salonId = zodValidation.mongoObjectId.parse(req.params.salonId);
        const result = zodValidation.editSalonSchema.parse(req.body);

        const salonExists = await Salon.findById(salonId);
        if (!salonExists) throw new AppError(404, 'Salon not found');

        if (result.sport) {
            const sportExists = await Sport.exists({ _id: result.sport });
            if (!sportExists) throw new AppError(404, 'Sport not found');
        }

        if (result.sportGroup) {
            const sportGroupExists = await SportGroup.exists({ _id: result.sportGroup });
            if (!sportGroupExists) throw new AppError(404, 'SportGroup not found');
        }
        // Check if user is owner of facility
        const isOwner = user.facility?.some((f) => f.equals(salonExists.facility));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this facility');
        }

        const updatedSalon = await Salon.findByIdAndUpdate(
            salonId,
            { $set: result },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Salon updated successfully',
            data: updatedSalon,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteSalon = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const salonId = zodValidation.mongoObjectId.parse(req.params.salonId);

        const salonExists = await Salon.findById(salonId);
        if (!salonExists) throw new AppError(404, 'Salon not found');

        // Check if user is owner of facility
        const isOwner = user.facility?.some((f) => f.equals(salonExists.facility));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this facility');
        }

        await Salon.findByIdAndDelete(salonId);

        res.status(204).json({
            success: true,
            message: 'Salon deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const addAvailableTimeForSalon = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const result = zodValidation.salonCalendarTimeSchema.parse(req.body);

        const salonExists = await Salon.findById(result.salonId).populate('facility');
        if (!salonExists) throw new AppError(404, 'Salon not found');

        // Check if user is owner of facility
        const isOwner = user.facility?.some((f) => f.equals(salonExists.facility._id));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this facility');
        }

        const newCalendar = await SalonCalendar.create({ ...result, salon: result.salonId });

        res.status(201).json({
            success: true,
            message: 'Calendar time slot created successfully',
            data: newCalendar,
        });
    } catch (err) {
        next(err);
    }
};

export const editCalendar = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const calendarId = zodValidation.mongoObjectId.parse(req.params.calendarId);
        const result = zodValidation.editCalendarSchema.parse(req.body);

        const salonExists = await Salon.exists({ _id: result.salonId });
        if (!salonExists) throw new AppError(404, 'Salon not found');

        const calendarExists = await SalonCalendar.findById(calendarId).populate({
            path: 'salon',
            populate: { path: 'facility' },
        });
        if (!calendarExists) throw new AppError(404, 'Calendar not found');
        console.log(calendarExists);

        // Check if user is owner of facility
        const isOwner = user.facility?.some((f) => f.equals(calendarExists.salon.facility._id));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this facility');
        }

        const updatedCalendar = await SalonCalendar.findByIdAndUpdate(
            calendarId,
            { $set: { ...result, salon: result.salonId } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Calendar updated successfully',
            data: updatedCalendar,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteCalendar = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const calendarId = zodValidation.mongoObjectId.parse(req.params.calendarId);

        const calendarExists = await SalonCalendar.findById(calendarId).populate({
            path: 'salon',
            populate: { path: 'facility' },
        });
        if (!calendarExists) throw new AppError(404, 'Calendar not found');

        // Check if user is owner of facility
        const isOwner = user.facility?.some((f) => f.equals(calendarExists.salon.facility._id));
        if (!isOwner && user.role !== 0) {
            throw new AppError(403, 'You are not the owner of this facility');
        }

        await SalonCalendar.findByIdAndDelete(calendarId);

        res.status(204).json({
            success: true,
            message: 'Calendar deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};
