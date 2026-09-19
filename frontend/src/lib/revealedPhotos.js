import { useState, useEffect } from "react";

// In-memory Set of service IDs whose photos have been loaded by the user.
// Persists across client-side page navigations, category filters, and tab switches,
// and resets only when the user refreshes the page (browser reload / F5).
const revealedPhotoIds = new Set();
const listeners = new Set();

export function isServicePhotoRevealed(serviceId) {
  if (!serviceId) return false;
  return revealedPhotoIds.has(String(serviceId));
}

export function revealServicePhoto(serviceId) {
  if (!serviceId) return;
  revealedPhotoIds.add(String(serviceId));
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export function useRevealedPhotos() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const notify = () => setTick((t) => t + 1);
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, []);

  return {
    isRevealed: (id) => isServicePhotoRevealed(id),
    revealPhoto: (id) => revealServicePhoto(id),
  };
}

