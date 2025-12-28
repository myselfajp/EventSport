import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
const allowedSize = 5 * 1024 * 1024;
const allowed = ['image/jpeg', 'image/png'];

export const createMulter = () => {
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
        limits: { fileSize: allowedSize },
        fileFilter: (req, file, cb) => {
            if (!allowed.includes(file.mimetype)) {
                return cb(new multer.MulterError('UNEXPECTED_FILE'), false);
            }
            cb(null, true);
        },
    });
};

