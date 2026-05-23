import EventEndPhoto from '../models/eventEndPhotoModel.js';

/** Normalize multer paths so clients can use `{assets}/path`. */
export function uploadsRelativePath(storedPath) {
    if (!storedPath || typeof storedPath !== 'string') return '';
    const forward = storedPath.replace(/\\/g, '/');
    const marker = '/uploads/';
    const idx = forward.indexOf(marker);
    if (idx !== -1) return forward.slice(idx + marker.length);
    const segments = forward.split('/');
    const uploadsIndex = segments.lastIndexOf('uploads');
    if (uploadsIndex !== -1 && uploadsIndex < segments.length - 1) {
        return segments.slice(uploadsIndex + 1).join('/');
    }
    return forward;
}

export async function loadMappedEventEndPhotos(eventId) {
    const rows = await EventEndPhoto.find({ event: eventId })
        .populate({ path: 'user', select: 'firstName lastName photo' })
        .populate({ path: 'coach', select: 'name' })
        .sort({ createdAt: -1 })
        .limit(80)
        .lean();

    return rows.map((row) => ({
        _id: row._id,
        createdAt: row.createdAt,
        photo: {
            path: uploadsRelativePath(row.photo?.path),
            originalName: row.photo?.originalName,
            mimeType: row.photo?.mimeType,
        },
        author: row.user
            ? {
                  kind: 'gamer',
                  firstName: row.user.firstName,
                  lastName: row.user.lastName,
                  photo: row.user.photo,
              }
            : row.coach
              ? {
                    kind: 'coach',
                    name: row.coach.name,
                }
              : { kind: 'unknown' },
    }));
}
