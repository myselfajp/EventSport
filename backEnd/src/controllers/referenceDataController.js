import mongoose from 'mongoose';
import { Sport, SportGoal, SportGroup, EventStyle } from '../models/referenceDataModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId, SearchQuerySchema, name, color } from '../utils/validation.js';

// sportGoal
export const createSportGoal = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }
        const result = name.parse(req.body?.name);
        const createSportGoal = await SportGoal.create({ name: result });
        if (!createSportGoal) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const getSportGoal = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const { perPage, pageNumber, search, sportGoal } = SearchQuerySchema.parse({
            perPage: req.body?.perPage,
            pageNumber: req.body?.pageNumber,
            search: req.body?.search,
            sportGoal: req.body?.sportGoal,
        });

        const query = {};

        // If search term is provided
        if (search) {
            query.$or = [{ name: { $regex: search, $options: 'i' } }];
        }

        // If sportGoal ID is provided
        if (sportGoal) {
            query._id = sportGoal;
        }

        const goals = await SportGoal.find(query)
            .skip((pageNumber - 1) * perPage)
            .limit(perPage);

        const total = await SportGoal.countDocuments(query);

        if (total === 0) throw new AppError(404, 'No sport goals found');

        res.status(200).json({
            success: true,
            data: goals,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const deleteSportGoal = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const result = mongoObjectId.parse(req.params.sportGoalId);
        const deleteSportGoal = await SportGoal.findByIdAndDelete(result);
        if (!deleteSportGoal) throw new AppError(404);

        res.status(204).json({
            success: true,
            data: null,
        });
    } catch (err) {
        next(err);
    }
};

// sportGroup
export const createSportGroup = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }
        const result = name.parse(req.body?.name);
        const createSportGroup = await SportGroup.create({ name: result });
        if (!createSportGroup) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const getSportGroup = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const { perPage, pageNumber, search, sportGroup } = SearchQuerySchema.parse({
            perPage: req.body?.perPage,
            pageNumber: req.body?.pageNumber,
            search: req.body?.search,
            sportGroup: req.body.sportGroup,
        });
        const query = {};

        if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }];

        if (sportGroup) {
            query._id = sportGroup;
        }

        const groups = await SportGroup.find(query)
            .skip((pageNumber - 1) * perPage)
            .limit(perPage);

        const total = await SportGroup.countDocuments(query);
        if (total === 0) throw new AppError(404);

        res.status(200).json({
            success: true,
            data: groups,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const updateSportGroup = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }
        const sportGroupId = mongoObjectId.parse(req.params.sportGroupId);
        const result = name.parse(req.body?.name);

        const updatedSportGroup = await SportGroup.findByIdAndUpdate(
            sportGroupId,
            { name: result },
            { new: true }
        );
        if (!updatedSportGroup) throw new AppError(404);

        await Sport.updateMany({ group: sportGroupId }, { groupName: result });

        res.status(200).json({
            success: true,
            data: updatedSportGroup,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteSportGroup = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }
        const session = await mongoose.startSession();
        session.startTransaction();

        const result = mongoObjectId.parse(req.params.sportGroupId);
        const deleteSportGroup = await SportGroup.findByIdAndDelete(result);
        const deleteRelatedSports = await Sport.deleteMany({ group: result });
        if (!deleteSportGroup || !deleteRelatedSports) {
            throw new AppError(404);
        }

        await session.commitTransaction();

        res.status(204).json({
            success: true,
            data: null,
        });
    } catch (err) {
        await session.abortTransaction();
        next(err);
    } finally {
        session.endSession();
    }
};

// sport
export const createSport = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const result = name.parse(req.body?.name);
        const sportGroupId = mongoObjectId.parse(req.params.sportGroupId);

        const sportGroup = await SportGroup.findById(sportGroupId);
        if (!sportGroup) throw new AppError(404);

        const createSport = await Sport.create({
            name: result,
            group: sportGroupId,
            groupName: sportGroup.name,
        });
        if (!createSport) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const getSport = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const { perPage, pageNumber, search, group, sport } = SearchQuerySchema.parse({
            perPage: req.body?.perPage,
            pageNumber: req.body?.pageNumber,
            search: req.body?.search,
            group: req.body?.groupId,
            sport: req.body?.sport,
        });
        const query = {};

        if (search) query.name = search;

        if (group) query.group = group;

        if (sport) query._id = sport;

        const sportData = await Sport.find(query)
            .skip((pageNumber - 1) * perPage)
            .limit(perPage);

        const total = await Sport.countDocuments(query);
        if (total === 0) throw new AppError(404);

        res.status(200).json({
            success: true,
            data: sportData,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const updateSport = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const sportId = mongoObjectId.parse(req.params.sportId);
        const result = name.parse(req.body?.name);

        const sport = await Sport.findById(sportId);
        if (!sport) throw new AppError(404);

        const updatedSport = await Sport.findByIdAndUpdate(
            sportId,
            { name: result },
            { new: true }
        );
        if (!updatedSport) throw new AppError(404);

        res.status(200).json({
            success: true,
            data: updatedSport,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteSport = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const result = mongoObjectId.parse(req.params.sportId);
        const deleteSport = await Sport.findByIdAndDelete(result);
        if (!deleteSport) throw new AppError(404);

        res.status(204).json({
            success: true,
            data: null,
        });
    } catch (err) {
        next(err);
    }
};
// eventStyle
export const createEventStyle = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const eventName = name.parse(req.body?.name);
        const eventColor = color.parse(req.body?.color);
        const createEventStyle = await EventStyle.create({ name: eventName, color: eventColor });
        if (!createEventStyle) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const getEventStyle = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const { perPage, pageNumber, search } = SearchQuerySchema.parse({
            perPage: req.body?.perPage,
            pageNumber: req.body?.pageNumber,
            search: req.body?.search,
        });
        const query = search
            ? {
                $or: [{ name: { $regex: search, $options: 'i' } }],
            }
            : {};

        const eventStyles = await EventStyle.find(query)
            .skip((pageNumber - 1) * perPage)
            .limit(perPage);

        const total = await EventStyle.countDocuments(query);
        if (total === 0) throw new AppError(404);

        res.status(200).json({
            success: true,
            data: eventStyles,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEventStyle = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const result = mongoObjectId.parse(req.params.eventStyleId);
        const deleteEventStyle = await EventStyle.findByIdAndDelete(result);
        if (!deleteEventStyle) throw new AppError(404);

        res.status(204).json({
            success: true,
            data: null,
        });
    } catch (err) {
        next(err);
    }
};
