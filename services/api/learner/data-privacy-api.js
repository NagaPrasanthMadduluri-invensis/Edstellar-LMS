import { apiClient } from "@/lib/api-client";
import { downloadFile } from "@/lib/download";

/** The signed-in user's own data and privacy requests (PDPA). */

export async function fetchMyData() {
  return apiClient("/api/my-data");
}

export async function fetchMyDataRequests() {
  return apiClient("/api/my-data/requests");
}

/** File a correction or deletion request. Reviewed by an admin, not instant. */
export async function createDataRequest({ data }) {
  return apiClient("/api/my-data/requests", { method: "POST", body: data });
}

/** Save everything held about the caller as a JSON file. Throws on failure. */
export async function downloadMyData() {
  return downloadFile("/api/my-data/export", { filename: "my-data.json" });
}
