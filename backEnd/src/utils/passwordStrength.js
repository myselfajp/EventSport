/**
 * Server-side safety net for password strength.
 * Zod handles detailed rules; this layer returns clear messages to the client.
 */
const PASSWORD_RULE_MESSAGE =
    'Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one digit, and one symbol.';

export const checkPasswordStrength = (password) => {
    if (!password) {
        return { valid: false, message: 'Password is required.' };
    }

    if (password.length < 8) {
        return { valid: false, message: PASSWORD_RULE_MESSAGE };
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (!(hasLower && hasUpper && hasDigit && hasSymbol)) {
        return { valid: false, message: PASSWORD_RULE_MESSAGE };
    }

    return { valid: true };
};
