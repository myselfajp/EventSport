import { AppError } from '../utils/appError.js';

export const HTTP_MESSAGES = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
};

const ERROR_MAPPINGS = {
    // Mongoose/MongoDB errors
    ValidationError: (err) => ({
        statusCode: 400,
        message: Object.values(err.errors)
            .map((e) => e.message)
            .join(', '),
    }),
    CastError: () => ({
        statusCode: 404,
        message: 'Not found',
    }),
    MongooseError: () => ({
        statusCode: 500,
        message: 'Database error',
    }),
    MongoError: () => ({
        statusCode: 500,
        message: 'Database operation failed',
    }),
    11000: () => ({
        statusCode: 409,
        message: 'Duplicate field value',
    }),

    // JWT errors
    JsonWebTokenError: () => ({
        statusCode: 401,
        message: 'Invalid token',
    }),
    TokenExpiredError: () => ({
        statusCode: 401,
        message: 'Token expired',
    }),
    NotBeforeError: () => ({
        statusCode: 401,
        message: 'Token not active',
    }),

    // JavaScript/Node.js errors
    SyntaxError: () => ({
        statusCode: 400,
        message: 'Invalid JSON format',
    }),
    TypeError: () => ({
        statusCode: 500,
        message: 'Internal server error',
    }),
    ReferenceError: () => ({
        statusCode: 500,
        message: 'Internal server error',
    }),
    RangeError: () => ({
        statusCode: 400,
        message: 'Invalid range',
    }),

    // zod errors
    ZodError: (err) => ({
        statusCode: 400,
        message: err.issues.map((e) => `${e.message}`).join(', '),
    }),

    // HTTP/Network errors
    ECONNREFUSED: () => ({
        statusCode: 503,
        message: 'Service unavailable',
    }),
    ENOTFOUND: () => ({
        statusCode: 503,
        message: 'Service unavailable',
    }),
    ETIMEDOUT: () => ({
        statusCode: 504,
        message: 'Request timeout',
    }),

    // Multer errors (file upload)
    MulterError: (err) => {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return { statusCode: 413, message: 'File too large' };
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return { statusCode: 400, message: 'Too many files' };
        }
        if (err.code === 'UNEXPECTED_FILE') {
            return { statusCode: 400, message: 'Invalid file type' };
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return { statusCode: 400, message: 'Invalid field' };
        }
        return { statusCode: 400, message: 'File upload error' };
    },
};

const handleKnownError = (err) => {
    // Check by error name first
    const nameHandler = ERROR_MAPPINGS[err.name];
    if (nameHandler) return nameHandler(err);

    // Check by error code
    const codeHandler = ERROR_MAPPINGS[err.code];
    if (codeHandler) return codeHandler(err);

    // Check by errno for network errors
    const errnoHandler = ERROR_MAPPINGS[err.errno];
    if (errnoHandler) return errnoHandler(err);

    return null;
};

export default (err, req, res, next) => {
    const isAppError = err instanceof AppError;
    let statusCode, message, logMessage;

    if (isAppError) {
        statusCode = err.statusCode;
        message = err.message;
        // For logging: use original error message if provided, otherwise use the AppError message
        logMessage = err.originalError?.message || err.message;
    } else {
        const knownError = handleKnownError(err);
        if (knownError) {
            ({ statusCode, message } = knownError);
            logMessage = message;
        } else {
            statusCode = 500;
            message = process.env.NODE_ENV === 'production' ? HTTP_MESSAGES[500] : err.message;
            logMessage = err.message;
        }
    }

    console.error('🔥 ERROR', {
        message: logMessage,
        statusCode,
        stack: isAppError ? err.originalError?.stack || err.stack : err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        time: new Date().toISOString(),
    });

    res.status(statusCode).json({
        success: false,
        error: message,
    });
};
