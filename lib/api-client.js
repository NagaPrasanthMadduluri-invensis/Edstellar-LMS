/** The NestJS API. Every request from this app goes here. */
const SERVER_BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || "";

/**
 * Exported for the few raw `fetch()` calls that bypass apiClient because they
 * stream a binary body (xlsx downloads). Those must still pass
 * `credentials: "include"` so the auth cookie travels cross-origin.
 */
export const SERVER_URL = SERVER_BASE_URL;

/**
 * Shared API client for every call.
 *
 * Authentication is carried entirely by the HttpOnly `lms_token` cookie, which
 * the browser attaches automatically — `credentials: "include"` is set on every
 * request so it travels to the API origin. Nothing here reads or holds a token;
 * client JavaScript cannot see it.
 *
 * @param {string} endpoint  Path beginning with /api
 * @param {object} [options] method, body, headers, and fetch options
 */
export async function apiClient(endpoint, options = {}) {
  const { body, method = "GET", headers: customHeaders, ...rest } = options;

  const headers = {
    Accept: "application/json",
    ...customHeaders,
  };

  // FormData carries its own multipart Content-Type, including a boundary the
  // browser generates. Setting the header by hand would omit that boundary and
  // the server would fail to parse the upload, so it is left alone.
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    method,
    headers,
    credentials: "include",
    ...rest,
  };

  if (body !== undefined) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const res = await fetch(`${SERVER_BASE_URL}${endpoint}`, config);

  // Non-JSON responses (file downloads) are handed back untouched.
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
      data.errors || null,
    );
  }

  return data;
}

/** Error carrying the HTTP status and any per-field validation errors. */
export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}
