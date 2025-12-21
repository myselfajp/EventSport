export const checkPasswordStrength = (password) => {
    if (!password) {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
        return {
            valid: false,
            message: 'Password must be at least 8 characters.',
        };
    }

    return { valid: true };
};

