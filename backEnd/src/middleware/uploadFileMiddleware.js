import { AppError } from '../utils/appError.js';
import { createMulter } from '../utils/multerConfig.js';
const uploadTimeout = 30000;

export const uploadFile = (options) => {
    const { fieldName, mode = 'single', maxCount = 5, fields = [], optional = false } = options;

    let handler;
    if (mode === 'single') {
        const upload = createMulter();
        handler = upload.single(fieldName);
    } else if (mode === 'array') {
        const upload = createMulter();
        handler = upload.array(fieldName, maxCount);
    } else if (mode === 'fields') {
        const upload = createMulter();
        handler = upload.fields(fields);
    }

    return (req, res, next) => {
        if (!req.user) throw new AppError(401);

        const timeoutId = setTimeout(() => {
            next(new AppError(408, 'File upload timeout'));
        }, uploadTimeout);

        handler(req, res, (err) => {
            clearTimeout(timeoutId);

            if (err) return next(err);

            if (mode === 'single') {
                if (!optional && !req.file) return next(new AppError(400, 'No file provided'));

                if (req.file) {
                    const { path, originalname, mimetype, size } = req.file;
                    req.fileMeta = { path, originalName: originalname, mimeType: mimetype, size };
                }
            }

            if (mode === 'array') {
                if (!optional && (!req.files || req.files.length === 0)) {
                    return next(new AppError(400, 'No files provided'));
                }

                if (req.files && req.files.length > 0) {
                    req.fileMeta = req.files.map(({ path, originalname, mimetype, size }) => ({
                        path,
                        originalName: originalname,
                        mimeType: mimetype,
                        size,
                    }));
                }
            }

            if (mode === 'fields') {
                if (!optional && (!req.files || Object.keys(req.files).length === 0)) {
                    return next(new AppError(400, 'No files provided'));
                }

                req.fileMeta = {};
                if (req.files && Object.keys(req.files).length > 0) {
                    for (const [field, files] of Object.entries(req.files)) {
                        req.fileMeta[field] = files.map(
                            ({ path, originalname, mimetype, size }) => ({
                                path,
                                originalName: originalname,
                                mimeType: mimetype,
                                size,
                            })
                        );
                    }
                }
            }

            next();
        });
    };
};

