/**
 * Sunucu tarafı son güvenlik ağı.
 * Zod tarafında detaylı kurallar olduğu için burada sadece taban kontroller var; mesaj kullanıcıya net yansıtılır.
 */
const PASSWORD_RULE_MESSAGE =
    'Şifre en az 8 karakter olmalı ve en az bir büyük harf, bir küçük harf, bir rakam ve bir sembol içermelidir.';

export const checkPasswordStrength = (password) => {
    if (!password) {
        return { valid: false, message: 'Şifre alanı zorunludur.' };
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

