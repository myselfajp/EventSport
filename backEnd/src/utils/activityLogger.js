import User from '../models/userModel.js';

export const logActivity = async (userId, action, req, success = true) => {
    try {
        if (!userId) return;

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';

        await User.findByIdAndUpdate(userId, {
            $push: {
                activityLog: {
                    $each: [
                        {
                            action,
                            ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
                            userAgent,
                            success,
                        },
                    ],
                    $slice: -50,
                },
            },
        });
    } catch (error) {
    }
};

