"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Star, X } from "lucide-react";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

const PREVIEW_REVIEW_LIMIT = 2;

export type CoachReviewItem = {
  userId: string;
  authorName: string;
  authorPhoto: string | null;
  rating: number | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CoachReviewsData = {
  summary: {
    averageRating: number | null;
    ratingCount: number;
    reviewCount: number;
  };
  reviews: CoachReviewItem[];
  viewer: {
    canReview: boolean;
    myRating: number | null;
    myComment: string | null;
  };
};

function StarDisplay({
  value,
  max = 5,
  size = "sm",
}: {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return (
          <Star
            key={i}
            className={`${sizeClass} ${
              filled
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-gray-300 dark:text-gray-600"
            }`}
          />
        );
      })}
    </div>
  );
}

function InteractiveStars({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="p-0.5 rounded transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
          >
            <Star
              className={`w-7 h-7 ${
                active
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-gray-300 dark:text-gray-600"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function ReviewCard({ review }: { review: CoachReviewItem }) {
  return (
    <li className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">
            {review.authorName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(review.updatedAt))}
          </p>
        </div>
        {review.rating != null && <StarDisplay value={review.rating} size="md" />}
      </div>
      {review.comment ? (
        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
          {review.comment}
        </p>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
          Rated without a written comment.
        </p>
      )}
    </li>
  );
}

function AllReviewsModal({
  reviews,
  totalCount,
  onClose,
}: {
  reviews: CoachReviewItem[];
  totalCount: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              All Reviews
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {totalCount} {totalCount === 1 ? "review" : "reviews"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50 dark:bg-gray-900">
          <ul className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard key={review.userId} review={review} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface CoachReviewsSectionProps {
  coachId: string | null;
  isOwnProfile: boolean;
  onSummaryChange?: (summary: CoachReviewsData["summary"]) => void;
}

export function CoachReviewSummaryBadge({
  averageRating,
  ratingCount,
}: {
  averageRating: number | null;
  ratingCount: number;
}) {
  if (!ratingCount || averageRating == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Star className="w-3.5 h-3.5" />
        No ratings yet
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
      <StarDisplay value={averageRating} size="sm" />
      <span className="font-semibold">{averageRating.toFixed(1)}</span>
      <span className="text-amber-700/80 dark:text-amber-300/80">
        ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
      </span>
    </span>
  );
}

export default function CoachReviewsSection({
  coachId,
  isOwnProfile,
  onSummaryChange,
}: CoachReviewsSectionProps) {
  const [data, setData] = useState<CoachReviewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [showAllReviews, setShowAllReviews] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchJSON(EP.COACH.reviews(coachId), { method: "GET" });
      if (res?.success && res?.data) {
        const payload = res.data as CoachReviewsData;
        setData(payload);
        setRating(payload.viewer.myRating ?? 0);
        setComment(payload.viewer.myComment ?? "");
        onSummaryChange?.(payload.summary);
      } else {
        setError(res?.message || res?.error || "Failed to load reviews");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [coachId, onSummaryChange]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleSaveRating = async (stars: number) => {
    if (!coachId || !stars) return;
    setSavingRating(true);
    setFormError("");
    setFormSuccess("");
    setRating(stars);
    try {
      const res = await apiFetch(EP.PARTICIPANT.pointToCoach, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Accept: "application/json",
        },
        body: JSON.stringify({ coachId, point: stars }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || body?.error || "Failed to save rating");
      }
      setFormSuccess("Rating saved.");
      await loadReviews();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to save rating");
    } finally {
      setSavingRating(false);
    }
  };

  const handleSaveComment = async () => {
    if (!coachId || !comment.trim()) return;
    setSavingComment(true);
    setFormError("");
    setFormSuccess("");
    try {
      const res = await apiFetch(EP.PARTICIPANT.commentToCoach, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Accept: "application/json",
        },
        body: JSON.stringify({ coachId, content: comment.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || body?.error || "Failed to save comment");
      }
      setFormSuccess("Review saved.");
      await loadReviews();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to save comment");
    } finally {
      setSavingComment(false);
    }
  };

  const summary = data?.summary;
  const canReview = data?.viewer.canReview && !isOwnProfile;
  const allReviews = data?.reviews ?? [];
  const previewReviews = allReviews.slice(0, PREVIEW_REVIEW_LIMIT);
  const hasMoreReviews = allReviews.length > PREVIEW_REVIEW_LIMIT;

  return (
    <div>
      <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-500" />
        Reviews &amp; Ratings
      </h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {summary?.ratingCount
          ? `${summary.averageRating?.toFixed(1)} average from ${summary.ratingCount} ${
              summary.ratingCount === 1 ? "rating" : "ratings"
            }`
          : "No ratings yet"}
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400 py-4">{error}</p>
      ) : (
        <>
          {canReview && (
            <div className="mb-6 p-4 rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-white dark:bg-gray-800 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Your review
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                You attended one of this coach&apos;s completed events. Share your experience.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <InteractiveStars
                  value={rating}
                  onChange={(v) => void handleSaveRating(v)}
                  disabled={savingRating}
                />
                {savingRating && (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                )}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Write a comment about this coach (optional)..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveComment()}
                  disabled={savingComment || !comment.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  Save comment
                </button>
                {!rating && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Select a star rating above to rate this coach.
                  </span>
                )}
              </div>

              {formError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{formError}</p>
              ) : null}
              {formSuccess ? (
                <p className="mt-2 text-xs text-green-600 dark:text-green-400">{formSuccess}</p>
              ) : null}
            </div>
          )}

          {!canReview && !isOwnProfile && data?.viewer && !data.viewer.canReview && (
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400 rounded-lg border border-dashed border-gray-200 dark:border-gray-600 px-4 py-3">
              Attend one of this coach&apos;s completed events to leave a rating or comment.
            </p>
          )}

          {allReviews.length > 0 ? (
            <>
              <ul className="space-y-3">
                {previewReviews.map((review) => (
                  <ReviewCard key={review.userId} review={review} />
                ))}
              </ul>
              {hasMoreReviews && (
                <button
                  type="button"
                  onClick={() => setShowAllReviews(true)}
                  className="mt-3 w-full px-4 py-2.5 text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
                >
                  View all reviews ({allReviews.length})
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm">
              No reviews yet.
            </div>
          )}
        </>
      )}

      {showAllReviews && (
        <AllReviewsModal
          reviews={allReviews}
          totalCount={allReviews.length}
          onClose={() => setShowAllReviews(false)}
        />
      )}
    </div>
  );
}
