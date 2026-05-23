import ContractAcceptance from '../models/contractAcceptanceModel.js';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';

export const listForAdmin = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.userId) {
            filter.user = mongoObjectId.parse(req.query.userId);
        }
        if (req.query.contractKey && typeof req.query.contractKey === 'string') {
            filter.contractKey = req.query.contractKey.trim();
        }
        if (req.query.context && typeof req.query.context === 'string') {
            filter.context = req.query.context.trim();
        }
        if (req.query.from || req.query.to) {
            filter.acceptedAt = {};
            if (req.query.from) {
                const from = new Date(req.query.from);
                if (!Number.isNaN(from.getTime())) filter.acceptedAt.$gte = from;
            }
            if (req.query.to) {
                const to = new Date(req.query.to);
                if (!Number.isNaN(to.getTime())) filter.acceptedAt.$lte = to;
            }
        }

        const [items, total] = await Promise.all([
            ContractAcceptance.find(filter)
                .sort({ acceptedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'firstName lastName email')
                .populate('legalDocumentId', 'docType version title')
                .populate('staticPageId', 'name title')
                .populate('event', 'name')
                .lean(),
            ContractAcceptance.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit) || 1,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

export const listByUserForAdmin = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 0) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const userId = mongoObjectId.parse(req.params.userId);

        const items = await ContractAcceptance.find({ user: userId })
            .sort({ acceptedAt: -1 })
            .populate('legalDocumentId', 'docType version title')
            .populate('staticPageId', 'name title')
            .populate('event', 'name')
            .lean();

        res.status(200).json({
            success: true,
            data: items,
        });
    } catch (err) {
        next(err);
    }
};
