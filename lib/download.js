import { SERVER_URL } from "@/lib/api-client";

/**
 * Download a file from the API.
 *
 * `apiClient` cannot do this: it hands a non-JSON response straight back, so
 * every caller then repeated the same blob/object-URL/anchor dance — and the
 * two that existed both swallowed their errors in an empty `catch`, which
 * meant a failed download was indistinguishable from a slow one. Nothing
 * appeared, nothing was said, and the admin clicked again.
 *
 * This throws instead, so the button can say what went wrong.
 *
 * @param {string} endpoint  Path beginning with /api
 * @param {object} [options] `method` and `body` (JSON-encoded), plus `filename`
 *                           as the fallback name when the server sends none.
 */
export async function downloadFile(endpoint, options = {}) {
  const { method = "GET", body, filename = "download" } = options;

  const res = await fetch(`${SERVER_URL}${endpoint}`, {
    method,
    credentials: "include",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    // An error from this API is JSON even when the success path is binary, so
    // the real message is usually there to be read.
    let message = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      /* not JSON — keep the status message */
    }
    throw new Error(message);
  }

  const blob = await res.blob();

  // An empty body is not a file. It means something upstream answered 200 with
  // nothing — saving it produces a 0-byte download that Excel refuses to open,
  // with no clue as to why.
  if (blob.size === 0) {
    throw new Error("The server returned an empty file.");
  }

  saveBlob(blob, filenameFrom(res) ?? filename);
}

/** The name the server asked for, from Content-Disposition. */
function filenameFrom(res) {
  const header = res.headers.get("content-disposition");
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Hand a blob to the browser as a save. */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick, not immediately: Safari cancels a download whose
  // object URL is released in the same frame as the click.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
