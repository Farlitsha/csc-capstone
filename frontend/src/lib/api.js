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
  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: "PATCH", body: { role } }),
};

export { ApiError, API_BASE_URL };
