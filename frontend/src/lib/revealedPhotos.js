import { useState, useEffect } from "react";
import { isDataSaverActive } from "../context/SettingsContext";

// In-memory Set of service IDs whose photos have been loaded by the user.
// Persists across client-side page navigations, category filters, and tab switches,
// and resets only when the user refreshes the page (browser reload / F5).
const revealedPhotoIds = new Set();
const listeners = new Set();

export function isServicePhotoRevealed(serviceId) {
  if (!serviceId) return false;
  // When Data Saver is OFF (Wi-Fi mode), auto-reveal photos without requiring a click
  if (!isDataSaverActive()) {
    return true;
  }
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

    const onDataSaverChange = () => notify();
    window.addEventListener("commhub_datasaver_changed", onDataSaverChange);

    return () => {
      listeners.delete(notify);
      window.removeEventListener("commhub_datasaver_changed", onDataSaverChange);
    };
  }, []);

  return {
    isRevealed: (id) => isServicePhotoRevealed(id),
    revealPhoto: (id) => revealServicePhoto(id),
  };
}

