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

