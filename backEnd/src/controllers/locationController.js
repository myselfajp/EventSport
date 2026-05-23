import { District } from '../models/locationModel.js';

const REGION = 'istanbul';

export const getIstanbulDistricts = async (req, res, next) => {
    try {
        const districts = await District.find({ region: REGION })
            .sort({ name: 1 })
            .select('name region')
            .lean();
        res.status(200).json({ success: true, data: districts });
    } catch (err) {
        next(err);
    }
};
