import { HTTP_MESSAGES } from '../middleware/errorHandler.js';

export class AppError extends Error {
    constructor(statusCode = 500, clientMessage = null, originalError = null) {
        // Use HTTP message as default if no custom message provided
        const message = clientMessage || HTTP_MESSAGES[statusCode] || HTTP_MESSAGES[500];
        super(message);

        this.statusCode = statusCode;
        this.isOperational = true;
        this.originalError = originalError;
    }
}
