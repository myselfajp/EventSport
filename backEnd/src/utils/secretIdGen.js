import { randomBytes } from 'crypto';

export const genSecret = function () {
    return randomBytes(6) // 6 bytes = 12 hex chars
        .toString('hex') // hex string
        .slice(0, 9) // cut to 9 chars
        .match(/.{1,3}/g) // split into 3-3-3
        .join('-'); // join with dashes
};
