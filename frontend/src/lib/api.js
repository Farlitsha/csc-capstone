const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

async function request(path, { method = "GET", body, form, auth = true, headers = {} } = {}) {
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
  return data;
}

export const api = {
  login: (username, password) => request("/users/login", { method: "POST", form: { username, password }, auth: false }),
  me: () => request("/users/me"),
  createAccount: (payload) => request("/users/account/create", { method: "POST", body: payload, auth: false }),
  listUsers: (skip = 0, limit = 20) => request(`/users/accounts/all?skip=${skip}&limit=${limit}`),

  listStudies: () => request("/studies/"),
  getStudy: (id) => request(`/studies/${id}`),
  createStudy: (payload) => request("/studies/", { method: "POST", body: payload }),
  closeStudy: (id) => request(`/studies/${id}/close`, { method: "PATCH" }),
  applyToStudy: (id) => request(`/studies/${id}/apply`, { method: "POST" }),
  getMyApplications: () => request("/applications/me"),
  getStudyApplicants: (id) => request(`/studies/${id}/applicants`),
  updateApplicationStatus: (id, status) => request(`/applications/${id}`, { method: "PATCH", body: { status } }),
  getStudySurveyResponses: (id) => request(`/studies/${id}/survey/responses`),

  listServices: ({ category, query } = {}) => {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (query) params.set("query", query);
    const qs = params.toString();
    return request(`/services/${qs ? `?${qs}` : ""}`, { auth: false });
  },
  createService: (payload) => request("/services/", { method: "POST", body: payload }),
  applyToService: (id, message) => request(`/services/${id}/apply`, { method: "POST", body: { message } }),
  closeService: (id) => request(`/services/${id}/close`, { method: "PATCH" }),
  deleteService: (id) => request(`/services/${id}`, { method: "DELETE" }),
  reportService: (serviceId, reason) => request(`/services/${serviceId}/report`, { method: "POST", body: { reason } }),
  listReports: () => request("/services/admin/reports"),
  dismissReport: (reportId) => request(`/services/admin/reports/${reportId}`, { method: "DELETE" }),

  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: "PATCH", body: { role } }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
  getAdminStats: () => request("/users/admin/stats"),
  listPendingResearchers: () => request("/users/admin/researchers/pending"),
  approveResearcher: (id) => request(`/users/admin/researchers/${id}/approve`, { method: "PATCH" }),
  rejectResearcher: (id) => request(`/users/admin/researchers/${id}/reject`, { method: "PATCH" }),

  // ── Profile management ──────────────────────────────────────────────────────
  getProfile: (userId) => request(`/users/${userId}`),
  updateProfile: (payload) => request("/users/me/profile", { method: "PATCH", body: payload }),
  uploadAvatar: async (file) => {
    const token = localStorage.getItem("commhub_token");
    const form = new FormData();
    form.append("file", file);
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

  createAnnouncement: (payload) => request("/announcements/", { method: "POST", body: payload }),
  listAnnouncements: () => request("/announcements/", { auth: false }),

  // ── Workshops ─────────────────────────────────────────────────────────────
  listWorkshops: (includeCancelled = false) =>
    request(`/workshops/${includeCancelled ? "?include_cancelled=true" : ""}`, { auth: false }),
  getWorkshop: (id) => request(`/workshops/${id}`, { auth: false }),
  createWorkshop: (payload) => request("/workshops/", { method: "POST", body: payload }),
  updateWorkshop: (id, payload) => request(`/workshops/${id}`, { method: "PATCH", body: payload }),
  cancelWorkshop: (id) => request(`/workshops/${id}/cancel`, { method: "PATCH" }),
  registerForWorkshop: (id) => request(`/workshops/${id}/register`, { method: "POST" }),
  cancelWorkshopRegistration: (id) => request(`/workshops/${id}/register`, { method: "DELETE" }),
  getWorkshopRegistrations: (id) => request(`/workshops/${id}/registrations`),
  getMyWorkshopRegistrations: () => request("/workshops/me/registrations"),
};


export { ApiError, API_BASE_URL };
