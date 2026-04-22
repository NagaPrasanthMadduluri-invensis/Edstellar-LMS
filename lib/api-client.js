const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Shared API client for all fetch calls.
 * Automatically attaches Bearer token from cookie.
 * Handles JSON parsing and error responses.
 */
export async function apiClient(endpoint, options = {}) {
  const { token, body, method = "GET", headers: customHeaders, ...rest } = options;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...customHeaders,
  };

  // Attach Bearer token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
    ...rest,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Handle non-JSON responses (e.g., file downloads)
  const contentType = res.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    if (!res.ok) {
      throw new ApiError("Request failed", res.status);
    }
    return res;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(
      data.message || data.error || "Something went wrong",
      res.status,
      data.errors || null
    );
  }

  return data;
}

/**
 * Custom error class for API errors with status and field errors
 */
export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}
