/**
 * CommHub Offline Cache Engine
 * Lightweight, zero-dependency localStorage cache supporting:
 * - Stale-While-Revalidate (SWR) with timestamps
 * - Strict Cache-First with TTL (Time-to-Live)
 * - Automatic mutation pattern invalidation
 */

const CACHE_PREFIX = "commhub_cache_";

export const cache = {
  /**
   * Get cached item by key. Returns null if not present.
   */
  get(key) {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Set cached item with timestamp and optional TTL/ETag.
   */
  set(key, data, { ttl = null, etag = null } = {}) {
    try {
      const entry = {
        data,
        cachedAt: Date.now(),
        ttl,
        etag,
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (e) {
      // If quota exceeded, clear older cache items
      if (e.name === "QuotaExceededError") {
        this.prune();
      }
    }
  },

  /**
   * Check if cache entry is still fresh within its TTL.
   */
  isFresh(key, ttl) {
    const entry = this.get(key);
    if (!entry) return false;
    const maxAge = ttl || entry.ttl;
    if (!maxAge) return true; // Without TTL, consider valid for SWR
    return Date.now() - entry.cachedAt < maxAge;
  },

  /**
   * Remove a specific cache key.
   */
  remove(key) {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch {
      // Ignore
    }
  },

  /**
   * Invalidate all cache entries matching a string or RegExp pattern.
   * e.g. invalidatePattern('/services') clears all services search and listing caches.
   */
  invalidatePattern(pattern) {
    try {
      const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(CACHE_PREFIX)) {
          const cacheKey = fullKey.slice(CACHE_PREFIX.length);
          if (regex.test(cacheKey)) {
            keysToRemove.push(fullKey);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  },

  /**
   * Prune oldest entries if storage is tight.
   */
  prune() {
    try {
      const entries = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(CACHE_PREFIX)) {
          const raw = localStorage.getItem(fullKey);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              entries.push({ fullKey, cachedAt: parsed.cachedAt || 0 });
            } catch {
              entries.push({ fullKey, cachedAt: 0 });
            }
          }
        }
      }
      // Sort oldest first and remove oldest half
      entries.sort((a, b) => a.cachedAt - b.cachedAt);
      const toRemove = entries.slice(0, Math.ceil(entries.length / 2));
      toRemove.forEach((e) => localStorage.removeItem(e.fullKey));
    } catch {
      // Ignore
    }
  },

  /**
   * Clear all CommHub cache.
   */
  clearAll() {
    this.invalidatePattern(".*");
  },
};

