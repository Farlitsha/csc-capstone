import { cache } from "./cache";
import { compressImage } from "./imageCompressor";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function getToken() {
  return localStorage.getItem("commhub_token");
}

/**
 * Enhanced HTTP request wrapper supporting:
 * - 'swr': Stale-While-Revalidate (instant offline load + background revalidation)
 * - 'cache-first': Strict cache check with TTL
 * - 'network-only': Standard network request
 * - Automatic mutation cache invalidation
 */
async function request(path, {
  method = "GET",
  body,
  form,
  auth = true,
  headers = {},
  cacheStrategy = method === "GET" ? "swr" : "network-only",
  ttl = null,
} = {}) {
  const isGet = method.toUpperCase() === "GET";
  const cacheKey = path;

  // 1. Strict Cache-First Check
  if (isGet && cacheStrategy === "cache-first" && cache.isFresh(cacheKey, ttl)) {
    const cached = cache.get(cacheKey);
    if (cached) return cached.data;
  }

  // 2. SWR Cached Copy for Offline Fallback
  const cachedEntry = isGet ? cache.get(cacheKey) : null;

  const finalHeaders = { ...headers };
  let payload = body;

  if (form) {
    payload = new URLSearchParams(form);
    finalHeaders["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (body) {
    payload = JSON.stringify(body);
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: payload,
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const detail = data?.detail || res.statusText;
      throw new ApiError(typeof detail === "string" ? detail : "Request failed", res.status, detail);
    }

    // Update cache on successful GET
    if (isGet && (cacheStrategy === "swr" || cacheStrategy === "cache-first")) {
      cache.set(cacheKey, data, { ttl });
    }

    // Invalidate related cache entries on successful mutations
    if (!isGet) {
      if (path.startsWith("/services")) cache.invalidatePattern("^/services");
      else if (path.startsWith("/studies") || path.startsWith("/applications")) {
        cache.invalidatePattern("^/(studies|applications)");
      } else if (path.startsWith("/workshops")) cache.invalidatePattern("^/workshops");
      else if (path.startsWith("/community")) cache.invalidatePattern("^/community");
      else if (path.startsWith("/announcements")) cache.invalidatePattern("^/announcements");
    }

    return data;
  } catch (err) {
    // 3. Graceful Offline Fallback: If network fails and cached data exists, return it seamlessly
    if (isGet && cachedEntry && cachedEntry.data) {
      return cachedEntry.data;
    }
    throw err;
  }
}

export const api = {
  login: (username, password) => request("/users/login", { method: "POST", form: { username, password }, auth: false }),
  adminLogin: (username, password) => request("/users/admin/login", { method: "POST", form: { username, password }, auth: false }),
  me: () => request("/users/me"),
  createAccount: (payload) => request("/users/account/create", { method: "POST", body: payload, auth: false }),
  listUsers: (skip = 0, limit = 20) => request(`/users/accounts/all?skip=${skip}&limit=${limit}`),

  listStudies: () => request("/studies/"),
  getStudy: (id) => request(`/studies/${id}`),
  createStudy: (payload) => request("/studies/", { method: "POST", body: payload }),
  updateStudy: (id, payload) => request(`/studies/${id}`, { method: "PUT", body: payload }),
  deleteStudy: (id) => request(`/studies/${id}`, { method: "DELETE" }),
  closeStudy: (id) => request(`/studies/${id}/close`, { method: "PATCH" }),
  applyToStudy: (id) => request(`/studies/${id}/apply`, { method: "POST" }),
  unapplyFromStudy: (id) => request(`/studies/${id}/apply`, { method: "DELETE" }),
  getMyApplications: () => request("/applications/me"),
  deleteApplication: (id) => request(`/applications/${id}`, { method: "DELETE" }),
  getStudyApplicants: (id) => request(`/studies/${id}/applicants`),
  updateApplicationStatus: (id, status) => request(`/applications/${id}`, { method: "PATCH", body: { status } }),
  getStudySurveyResponses: (id) => request(`/studies/${id}/survey/responses`),
  getStudySurvey: (id) => request(`/studies/${id}/survey`),
  upsertStudySurvey: (id, payload) => request(`/studies/${id}/survey`, { method: "PUT", body: payload }),
  submitSurveyResponse: (id, payload) => request(`/studies/${id}/survey/responses`, { method: "POST", body: payload }),
  clearSurveyResponse: (studyId) => request(`/studies/${studyId}/survey/response`, { method: "DELETE" }),
  clearAllCompletedSurveys: () => request("/applications/me/completed", { method: "DELETE" }),

  listServices: ({ category, query } = {}) => {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (query) params.set("query", query);
    const qs = params.toString();
    return request(`/services/${qs ? `?${qs}` : ""}`, { auth: false });
  },
  createService: (payload) => request("/services/", { method: "POST", body: payload }),
  updateService: (id, payload) => request(`/services/${id}`, { method: "PUT", body: payload }),
  applyToService: (id, message) => request(`/services/${id}/apply`, { method: "POST", body: { message } }),
  closeService: (id) => request(`/services/${id}/close`, { method: "PATCH" }),
  deleteService: (id) => request(`/services/${id}`, { method: "DELETE" }),

  reportService: (serviceId, reason) => request(`/services/${serviceId}/report`, { method: "POST", body: { reason } }),
  listReports: (statusFilter = null) =>
    request(statusFilter ? `/reports/?status_filter=${statusFilter}` : "/reports/"),
  updateReportStatus: (reportId, status) => request(`/reports/${reportId}`, { method: "PATCH", body: { status } }),
  dismissReport: (reportId) => request(`/reports/${reportId}`, { method: "PATCH", body: { status: "dismissed" } }),
  resolveReport: (reportId) => request(`/reports/${reportId}`, { method: "PATCH", body: { status: "resolved" } }),
  deleteReport: (reportId) => request(`/reports/${reportId}`, { method: "DELETE" }),

  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: "PATCH", body: { role } }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
  deleteMyAccount: () => request("/users/me", { method: "DELETE" }),
  deactivateMyAccount: () => request("/users/me/deactivate", { method: "PATCH" }),
  reactivateAccount: (username, password) =>
    request("/users/account/reactivate", { method: "POST", form: { username, password }, auth: false }),
  getAdminStats: () => request("/users/admin/stats"),
  listPendingResearchers: () => request("/users/admin/researchers/pending"),
  approveResearcher: (id) => request(`/users/admin/researchers/${id}/approve`, { method: "PATCH" }),
  rejectResearcher: (id) => request(`/users/admin/researchers/${id}/reject`, { method: "PATCH" }),

  // Profile management
  getProfile: (userId) => request(`/users/${userId}`),
  updateProfile: (payload) => request("/users/me/profile", { method: "PATCH", body: payload }),
  uploadAvatar: async (file) => {
    const compressed = await compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.6 }).catch(() => file);
    const token = localStorage.getItem("commhub_token");
    const form = new FormData();
    form.append("file", compressed);
    const res = await fetch(`${API_BASE_URL}/users/me/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      const detail = data?.detail || res.statusText;
      throw new ApiError(typeof detail === "string" ? detail : "Upload failed", res.status, detail);
    }
    return data;
  },
  uploadServicePhoto: async (file) => {
    const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.6 }).catch(() => file);
    const token = localStorage.getItem("commhub_token");
    const form = new FormData();
    form.append("file", compressed);
    const res = await fetch(`${API_BASE_URL}/services/upload-photo`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      const detail = data?.detail || res.statusText;
      throw new ApiError(typeof detail === "string" ? detail : "Upload failed", res.status, detail);
    }
    return data;
  },

  createAnnouncement: (payload) => request("/announcements/", { method: "POST", body: payload }),
  listAnnouncements: () => request("/announcements/", { auth: false }),
  deleteAnnouncement: (id) => request(`/announcements/${id}`, { method: "DELETE" }),
  listAuditLogs: (skip = 0, limit = 50) => request(`/audit-logs/?skip=${skip}&limit=${limit}`),

  // Workshops
  listWorkshops: (includeCancelled = false) =>
    request(`/workshops/${includeCancelled ? "?include_cancelled=true" : ""}`, { auth: false }),
  getWorkshop: (id) => request(`/workshops/${id}`, { auth: false }),
  createWorkshop: (payload) => request("/workshops/", { method: "POST", body: payload }),
  updateWorkshop: (id, payload) => request(`/workshops/${id}`, { method: "PATCH", body: payload }),
  cancelWorkshop: (id) => request(`/workshops/${id}/cancel`, { method: "PATCH" }),
  registerForWorkshop: (id) => request(`/workshops/${id}/register`, { method: "POST" }),
  cancelWorkshopRegistration: (id) => request(`/workshops/${id}/register`, { method: "DELETE" }),
  deleteWorkshop: (id) => request(`/workshops/${id}`, { method: "DELETE" }),
  getWorkshopRegistrations: (id) => request(`/workshops/${id}/registrations`),
  getMyWorkshopRegistrations: () => request("/workshops/me/registrations"),


  // Community census & statistics
  getMyCensus: () => request("/community/census/my"),
  submitCensus: (body) => request("/community/census", { method: "POST", body }),
  getCensusStats: () => request("/community/census/stats"),
};



export { ApiError, API_BASE_URL, cache };
