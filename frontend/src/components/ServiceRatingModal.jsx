import { useState, useEffect } from "react";
import Button from "./Button";
import Icon from "./Icon";
import Spinner from "./Spinner";
import { api, ApiError, API_BASE_URL } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./ServiceRatingModal.css";

function avatarSrc(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
}

function getInitials(name) {
  if (!name) return "U";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export default function ServiceRatingModal({
  service,
  isOpen,
  onClose,
  onRatingSubmitted,
  onOpenGuestModal,
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [ratingsData, setRatingsData] = useState({ average_rating: null, total_ratings: 0, ratings: [] });
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(5);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAuthor = user && service && user.id === service.poster_id;

  const starLabels = {
    1: t("ratings.star1") || "Poor",
    2: t("ratings.star2") || "Fair",
    3: t("ratings.star3") || "Good",
    4: t("ratings.star4") || "Very Good",
    5: t("ratings.star5") || "Excellent!",
  };

  function loadRatings() {
    if (!service) return;
    setLoading(true);
    setError("");
    api
      .getServiceRatings(service.id)
      .then((data) => {
        setRatingsData(data);
        // If current user already rated, populate their rating
        if (user) {
          const mine = data.ratings?.find((r) => r.user_id === user.id);
          if (mine) {
            setScore(mine.score);
            setComment(mine.comment || "");
          } else {
            setScore(5);
            setComment("");
          }
        }
      })
      .catch(() => setError(t("ratings.loadError") || "Could not load reviews for this service."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isOpen && service) {
      loadRatings();
    }
  }, [isOpen, service?.id]);

  if (!isOpen || !service) return null;

  const myRating = user ? ratingsData.ratings?.find((r) => r.user_id === user.id) : null;
  const activeScore = hoverScore || score;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      if (onOpenGuestModal) onOpenGuestModal("rate a service");
      return;
    }
    if (isAuthor) {
      setError(t("ratings.selfRateError") || "You cannot rate your own service listing.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await api.rateService(service.id, {
        score,
        comment: comment.trim() || null,
      });
      setSuccess(myRating ? (t("ratings.ratingUpdated") || "Rating updated successfully!") : (t("ratings.ratingSuccess") || "Thank you for your rating!"));
      // Reload ratings and update parent card
      const updated = await api.getServiceRatings(service.id);
      setRatingsData(updated);
      if (onRatingSubmitted) {
        onRatingSubmitted(service.id, {
          average_rating: updated.average_rating,
          rating_count: updated.total_ratings,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : (t("ratings.submitError") || "Could not submit rating."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRating() {
    if (!myRating) return;
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      await api.deleteMyServiceRating(service.id);
      setScore(5);
      setComment("");
      setSuccess(t("ratings.ratingRemoved") || "Rating removed.");
      const updated = await api.getServiceRatings(service.id);
      setRatingsData(updated);
      if (onRatingSubmitted) {
        onRatingSubmitted(service.id, {
          average_rating: updated.average_rating,
          rating_count: updated.total_ratings,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : (t("ratings.deleteError") || "Could not delete rating."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="ch-rating-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ch-rating-modal-title"
    >
      <div className="ch-rating-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ch-rating-modal__header">
          <div className="ch-rating-modal__title-wrap">
            <h2 id="ch-rating-modal-title" className="ch-rating-modal__title">
              {t("ratings.modalTitle") || "Peer Reviews & Ratings"}
            </h2>
            <p className="ch-rating-modal__subtitle">
              {service.title} • {t("ratings.by") || "by"} @{service.poster_display_name || service.poster_username}
            </p>
          </div>
          <button
            type="button"
            className="ch-rating-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ch-rating-modal__body">
          {/* Average Rating Summary */}
          <div className="ch-rating-summary">
            <div className="ch-rating-summary__score">
              {ratingsData.average_rating !== null ? ratingsData.average_rating.toFixed(1) : "—"}
            </div>
            <div className="ch-rating-summary__meta">
              <div className="ch-rating-summary__stars" aria-label={`Average rating: ${ratingsData.average_rating ?? "None"}`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Icon
                    key={s}
                    name={ratingsData.average_rating && ratingsData.average_rating >= s ? "star-fill" : "star"}
                    size={18}
                  />
                ))}
              </div>
              <span className="ch-rating-summary__count">
                {ratingsData.total_ratings === 0
                  ? (t("ratings.noRatingsYet") || "No reviews yet")
                  : ratingsData.total_ratings === 1
                  ? (t("ratings.oneReview") || "1 peer review")
                  : `${ratingsData.total_ratings} ${t("ratings.reviewsCount") || "peer reviews"}`}
              </span>
            </div>
          </div>

          {/* Rating Submission / Edit Form */}
          {isAuthor ? (
            <div className="ch-rating-notice ch-rating-notice--self">
              <span>{t("ratings.selfNotice") || "You posted this service. Service authors cannot rate their own listings."}</span>
            </div>
          ) : !user ? (
            <div className="ch-rating-notice">
              <span>{t("ratings.guestNotice") || "Sign in with your account to rate this service and share feedback."}</span>
              <Button
                variant="accent"
                onClick={() => {
                  onClose();
                  if (onOpenGuestModal) onOpenGuestModal("rate a service");
                }}
              >
                {t("ratings.signInBtn") || "Sign In"}
              </Button>
            </div>
          ) : (
            <form className="ch-rating-form-card" onSubmit={handleSubmit}>
              <h3 className="ch-rating-form-card__title">
                {myRating ? (t("ratings.yourRatingTitle") || "Your Rating & Review") : (t("ratings.rateTitle") || "Rate this Service")}
              </h3>

              <div className="ch-star-input-row" role="group" aria-label={t("ratings.starSelect") || "Select star rating"}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`ch-star-btn ${activeScore >= num ? "ch-star-btn--filled" : ""}`}
                    onClick={() => setScore(num)}
                    onMouseEnter={() => setHoverScore(num)}
                    onMouseLeave={() => setHoverScore(0)}
                    aria-label={`${num} star${num === 1 ? "" : "s"}`}
                  >
                    <Icon name={activeScore >= num ? "star-fill" : "star"} size={26} />
                  </button>
                ))}
                <span className="ch-star-label">{starLabels[activeScore]}</span>
              </div>

              <textarea
                className="ch-rating-textarea"
                placeholder={t("ratings.commentPlaceholder") || "Share your experience with this service... (optional)"}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
              />

              {error && <p className="ch-rating-error" role="alert">{error}</p>}
              {success && <p className="ch-rating-success" role="status">{success}</p>}

              <div className="ch-rating-form-actions">
                {myRating && (
                  <button
                    type="button"
                    className="ch-rating-delete-btn"
                    onClick={handleDeleteRating}
                    disabled={deleting || submitting}
                  >
                    {deleting ? (t("ratings.deleting") || "Deleting…") : (t("ratings.deleteRating") || "Delete Rating")}
                  </button>
                )}
                <Button type="submit" variant="accent" disabled={submitting || deleting}>
                  {submitting ? (t("ratings.saving") || "Saving…") : myRating ? (t("ratings.updateRating") || "Update Rating") : (t("ratings.submitRating") || "Submit Rating")}
                </Button>
              </div>
            </form>
          )}

          {/* List of Community Reviews */}
          <div className="ch-reviews-section">
            <h3 className="ch-reviews-section__title">
              {t("ratings.communityFeedback") || "Community Feedback"} ({ratingsData.ratings?.length || 0})
            </h3>

            {loading ? (
              <Spinner />
            ) : ratingsData.ratings?.length === 0 ? (
              <div className="ch-reviews-empty">
                {t("ratings.noReviewsEmpty") || "No peer reviews yet. Be the first to share your experience with this provider!"}
              </div>
            ) : (
              <div className="ch-reviews-list">
                {ratingsData.ratings.map((r) => {
                  const avatar = avatarSrc(r.rater_avatar_url);
                  const name = r.rater_display_name || r.rater_username || "Community Member";
                  const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString() : "";
                  return (
                    <div className="ch-review-item" key={r.id}>
                      <div className="ch-review-item__head">
                        <div className="ch-review-item__user">
                          {avatar ? (
                            <img className="ch-review-avatar" src={avatar} alt={name} />
                          ) : (
                            <div className="ch-review-avatar">{getInitials(name)}</div>
                          )}
                          <span className="ch-review-user-name">{name}</span>
                        </div>
                        <div className="ch-review-item__stars" aria-label={`${r.score} stars`}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Icon
                              key={s}
                              name={r.score >= s ? "star-fill" : "star"}
                              size={13}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="ch-review-item__comment">{r.comment}</p>
                      )}
                      {dateStr && (
                        <span className="ch-review-item__date">{dateStr}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

