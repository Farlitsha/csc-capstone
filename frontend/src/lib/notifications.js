import { useState, useEffect, useCallback } from "react";
import { api } from "./api";

const STORAGE_KEY = "commhub_read_announcements";
const LAST_SEEN_KEY = "commhub_announcements_last_seen";
const EVENT_NAME = "commhub_notifications_changed";

export function getReadAnnouncementIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(Number) : []);
  } catch {
    return new Set();
  }
}

export function saveReadAnnouncementIds(idsSet) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(idsSet)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(EVENT_NAME));
    }
  } catch {
    // Ignore storage errors
  }
}

export function markAnnouncementAsRead(id) {
  if (id == null) return;
  const read = getReadAnnouncementIds();
  read.add(Number(id));
  saveReadAnnouncementIds(read);
}

export function markAllAnnouncementsAsRead(announcements = []) {
  const read = getReadAnnouncementIds();
  announcements.forEach((a) => {
    if (a?.id != null) read.add(Number(a.id));
  });
  try {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
  } catch {
    // Ignore
  }
  saveReadAnnouncementIds(read);
}

export function isAnnouncementRecent(announcement, hours = 48) {
  if (!announcement?.created_at) return false;
  const created = new Date(announcement.created_at).getTime();
  const now = Date.now();
  const diffHours = (now - created) / (1000 * 60 * 60);
  return diffHours <= hours;
}

export function isAnnouncementUnread(announcement, readIds = null) {
  if (!announcement?.id) return false;
  const ids = readIds || getReadAnnouncementIds();
  return !ids.has(Number(announcement.id));
}

export function isAnnouncementNew(announcement, readIds = null) {
  // New indicator must disappear when notification is read
  return isAnnouncementUnread(announcement, readIds);
}

export function filterRelevantAnnouncements(announcements = [], user = null) {
  return announcements.filter((a) => {
    if (!a.audience || a.audience === "All members") return true;
    if ((!user || user?.role === "community_member") && a.audience === "Community Members") return true;
    if (user?.role === "researcher" && a.audience === "Researchers") return true;
    if (user?.role === "admin") return true;
    return false;
  });
}

export function useUnreadNotifications(user = null) {
  const [readIds, setReadIds] = useState(() => getReadAnnouncementIds());
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadAnnouncements = useCallback(() => {
    api
      .listAnnouncements()
      .then((list) => {
        const relevant = filterRelevantAnnouncements(list || [], user);
        setAnnouncements(relevant);
      })
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    reloadAnnouncements();
  }, [reloadAnnouncements]);

  useEffect(() => {
    const handleChanged = () => {
      setReadIds(getReadAnnouncementIds());
    };
    window.addEventListener(EVENT_NAME, handleChanged);
    window.addEventListener("storage", handleChanged);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChanged);
      window.removeEventListener("storage", handleChanged);
    };
  }, []);

  const unreadCount = announcements.filter((a) => !readIds.has(Number(a.id))).length;

  const markRead = useCallback((id) => {
    markAnnouncementAsRead(id);
  }, []);

  const markAllRead = useCallback(() => {
    markAllAnnouncementsAsRead(announcements);
  }, [announcements]);

  return {
    announcements,
    unreadCount,
    readIds,
    loading,
    markRead,
    markAllRead,
    isUnread: (a) => !readIds.has(Number(a?.id)),
    isRecent: (a) => isAnnouncementRecent(a, 48),
    isNew: (a) => !readIds.has(Number(a?.id)),
    refresh: reloadAnnouncements,
  };
}
