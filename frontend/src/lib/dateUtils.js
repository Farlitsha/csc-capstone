/**
 * Utility functions for relative time calculations across CommHub listings.
 */

/**
 * Formats a timestamp into human-readable relative time:
 * "Just now", "5m ago", "2h ago", "Yesterday", "3d ago", "2w ago", "1mo ago", "1y ago"
 */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

/**
 * Prepends "Posted" for cards and headers:
 * e.g. "Posted just now", "Posted yesterday", "Posted 2h ago"
 */
export function formatPostedAgo(dateInput) {
  const rel = formatTimeAgo(dateInput);
  if (!rel) return "";
  if (rel === "Just now") return "Posted just now";
  if (rel === "Yesterday") return "Posted yesterday";
  return `Posted ${rel}`;
}

