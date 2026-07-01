import User from '../models/userModel.js';
import Event from '../models/eventModel.js';
import Reservation from '../models/reservationModel.js';
import Point from '../models/pointModel.js';
import Comment from '../models/commentModel.js';
import Coach from '../models/coachModel.js';

/**
 * Gamer may review a coach after attending one of the coach's completed events.
 */
export async function canGamerReviewCoach(participantId, coachUserId) {
    if (!participantId || !coachUserId) return false;

    const coachEvents = await Event.find({
        $or: [{ owner: coachUserId }, { backupCoach: coachUserId }],
        endTime: { $lte: new Date() },
        status: { $ne: 'cancelled' },
    })
        .select('_id')
        .lean();

    const eventIds = coachEvents.map((e) => e._id);
    if (eventIds.length === 0) return false;

    const joined = await Reservation.exists({
        participant: participantId,
        event: { $in: eventIds },
        isJoined: true,
        isCheckedIn: true,
        isCancelled: { $ne: true },
        isWaitListed: { $ne: true },
    });

    return Boolean(joined);
}

export async function assertGamerCanReviewCoach(user, coachId) {
    if (!user?.participant) {
        return { ok: false, status: 403, message: 'Only gamers with a participant profile can review coaches.' };
    }

    const coach = await Coach.findById(coachId).select('_id');
    if (!coach) {
        return { ok: false, status: 404, message: 'Coach not found.' };
    }

    const coachUser = await User.findOne({ coach: coachId }).select('_id');
    if (!coachUser) {
        return { ok: false, status: 404, message: 'Coach user not found.' };
    }

    if (String(coachUser._id) === String(user._id)) {
        return { ok: false, status: 403, message: 'You cannot review your own coach profile.' };
    }

    const eligible = await canGamerReviewCoach(user.participant, coachUser._id);
    if (!eligible) {
        return {
            ok: false,
            status: 403,
            message:
                'You can review this coach after attending one of their completed events.',
        };
    }

    return { ok: true, coach, coachUser };
}

export async function refreshCoachRatingSummary(coachId) {
    const [stats] = await Point.aggregate([
        { $match: { toCoach: coachId } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$point' },
                ratingCount: { $sum: 1 },
            },
        },
    ]);

    const ratingCount = stats?.ratingCount ?? 0;
    const ratingAverage =
        ratingCount > 0 ? Math.round(stats.averageRating * 10) / 10 : null;

    await Coach.findByIdAndUpdate(coachId, {
        ratingAverage,
        ratingCount,
    });

    return { averageRating: ratingAverage, ratingCount };
}

export async function getCoachReviewSummary(coachId) {
    const coach = await Coach.findById(coachId).select('ratingAverage ratingCount').lean();
    if (coach?.ratingCount != null && coach.ratingCount > 0) {
        return {
            averageRating: coach.ratingAverage,
            ratingCount: coach.ratingCount,
        };
    }

    return refreshCoachRatingSummary(coachId);
}

function authorLabel(user) {
    if (!user) return 'Gamer';

    const firstName = `${user.firstName || ''}`.trim();
    const lastName = `${user.lastName || ''}`.trim();
    const lastInitial = Array.from(lastName)[0]?.toLocaleUpperCase('en-US');

    if (firstName && lastInitial) return `${firstName} ${lastInitial}.`;
    if (firstName) return firstName;
    if (lastInitial) return `${lastInitial}.`;
    return 'Gamer';
}

export async function buildCoachReviewsPayload(coachId, viewerUser = null) {
    const summary = await getCoachReviewSummary(coachId);

    const [ratings, comments] = await Promise.all([
        Point.find({ toCoach: coachId })
            .sort({ updatedAt: -1 })
            .populate({ path: 'fromUser', select: 'firstName lastName photo' })
            .lean(),
        Comment.find({ toCoach: coachId, isActive: true })
            .sort({ updatedAt: -1 })
            .populate({ path: 'fromUser', select: 'firstName lastName photo' })
            .lean(),
    ]);

    const commentByUser = new Map(
        comments.map((c) => [String(c.fromUser?._id || c.fromUser), c])
    );
    const seenUsers = new Set();

    const reviews = [];

    for (const rating of ratings) {
        const userId = String(rating.fromUser?._id || rating.fromUser);
        seenUsers.add(userId);
        const commentDoc = commentByUser.get(userId);
        reviews.push({
            userId,
            authorName: authorLabel(rating.fromUser),
            authorPhoto: rating.fromUser?.photo?.path ?? null,
            rating: rating.point,
            comment: commentDoc?.content ?? null,
            createdAt: rating.createdAt,
            updatedAt: rating.updatedAt,
        });
    }

    for (const commentDoc of comments) {
        const userId = String(commentDoc.fromUser?._id || commentDoc.fromUser);
        if (seenUsers.has(userId)) continue;
        reviews.push({
            userId,
            authorName: authorLabel(commentDoc.fromUser),
            authorPhoto: commentDoc.fromUser?.photo?.path ?? null,
            rating: null,
            comment: commentDoc.content,
            createdAt: commentDoc.createdAt,
            updatedAt: commentDoc.updatedAt,
        });
    }

    reviews.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const reviewCount = reviews.filter((r) => r.comment).length;

    let viewer = {
        canReview: false,
        myRating: null,
        myComment: null,
    };

    if (viewerUser?.participant) {
        const eligibility = await assertGamerCanReviewCoach(viewerUser, coachId);
        viewer.canReview = eligibility.ok;

        const [myPoint, myComment] = await Promise.all([
            Point.findOne({ fromUser: viewerUser._id, toCoach: coachId })
                .select('point')
                .lean(),
            Comment.findOne({ fromUser: viewerUser._id, toCoach: coachId, isActive: true })
                .select('content')
                .lean(),
        ]);

        viewer.myRating = myPoint?.point ?? null;
        viewer.myComment = myComment?.content ?? null;
    }

    return {
        summary: {
            ...summary,
            reviewCount,
        },
        reviews,
        viewer,
    };
}
