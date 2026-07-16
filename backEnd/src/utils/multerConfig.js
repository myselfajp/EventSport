import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
const DEFAULT_ALLOWED_SIZE = 5 * 1024 * 1024;
const DEFAULT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Coach / Performance Team certificate uploads (images + PDF). */
export const CERTIFICATE_ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
];

export const createMulter = (options = {}) => {
    const {
        maxFileSize = DEFAULT_ALLOWED_SIZE,
        allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
    } = options;

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join('uploads', file.fieldname);
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);

            const timeStamp = Date.now();
            const randomHash = randomBytes(16).toString('hex');
            const fileName = `${timeStamp}-${randomHash}${ext}`;
            cb(null, fileName);
        },
    });

    return multer({
        storage,
        limits: { fileSize: maxFileSize },
        fileFilter: (req, file, cb) => {
            if (allowedMimeTypes.includes(file.mimetype)) {
                return cb(null, true);
            }

            const ext = path.extname(file.originalname).toLowerCase();
            const allowsPdf = allowedMimeTypes.includes('application/pdf');
            if (
                allowsPdf &&
                ext === '.pdf' &&
                (file.mimetype === 'application/octet-stream' || !file.mimetype)
            ) {
                return cb(null, true);
            }

            return cb(new multer.MulterError('UNEXPECTED_FILE'), false);
        },
    });
};

