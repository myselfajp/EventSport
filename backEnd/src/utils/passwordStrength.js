const commonPasswords = [
    'password',
    'password123',
    '12345678',
    '123456789',
    '1234567890',
    'qwerty123',
    'abc123456',
    'Password1',
    'Password123',
    'Admin123',
    'Welcome123',
    'Aa@123456',
    'Aa123456',
    'Aa@12345',
    'Test1234',
    'User1234',
];

export const checkPasswordStrength = (password) => {
    if (!password) {
        return { valid: false, message: 'Password is required' };
    }

    const lowerPassword = password.toLowerCase();

    if (commonPasswords.some((common) => lowerPassword.includes(common.toLowerCase()))) {
        return {
            valid: false,
            message: 'Password is too common. Please choose a more unique password.',
        };
    }

    const hasRepeatingChars = /(.)\1{3,}/.test(password);
    if (hasRepeatingChars) {
        return {
            valid: false,
            message: 'Password contains too many repeating characters.',
        };
    }

    const hasSequentialChars = /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
        password
    );
    if (hasSequentialChars) {
        return {
            valid: false,
            message: 'Password contains sequential characters.',
        };
    }

    const uniqueChars = new Set(password).size;
    if (uniqueChars < 6) {
        return {
            valid: false,
            message: 'Password must contain at least 6 unique characters.',
        };
    }

    return { valid: true };
};

