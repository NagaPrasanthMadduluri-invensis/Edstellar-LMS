import { apiClient } from "@/lib/api-client";

/**
 * The audit log, for whichever portal is asking.
 *
 * ONE function per read, with the BASE chosen by the caller, because the two
 * endpoints are the same shape over different scopes — `/admin/activity` is
 * the caller's own organization and `/platform/activity` is every tenant.
 * The server decides which from the controller that answered, never from a
 * parameter, so passing the wrong base here cannot widen anybody's reach; it
 * just 403s.
 */
function toQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === "" || value === null || value === undefined || value === "all") continue;
    params.set(key, String(value));
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function fetchActivity(base, filters) {
  return apiClient(`/api/${base}/activity${toQuery(filters)}`);
}

export function fetchActivityOptions(base) {
  return apiClient(`/api/${base}/activity/options`);
}
