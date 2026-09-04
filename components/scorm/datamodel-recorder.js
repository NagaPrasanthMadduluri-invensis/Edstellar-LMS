import { apiClient } from "@/lib/api-client";

/**
 * Records every SCORM data-model write and ships it to the API in batches.
 *
 * WHY A WRAPPER RATHER THAN OUR OWN window.API
 * --------------------------------------------
 * `scorm-again` already provides a spec-compliant `window.API` (1.2) and
 * `window.API_1484_11` (2004): the full data model, the vocabularies, the
 * error codes `LMSGetLastError` has to return, and 2004 sequencing. This file
 * does not replace any of that. It proxies the two write entry points so every
 * `SetValue` is also recorded as a delta, and leaves the runtime semantics to
 * the library. Reimplementing the runtime to get telemetry would have risked
 * every package that works today for something a 30-line proxy already gives.
 *
 * DELIVERY
 * --------
 * `fetch(..., { keepalive: true })`, not `navigator.sendBeacon`. A beacon
 * cannot carry JSON cross-origin: the request is `no-cors`, which restricts it
 * to a CORS-safelisted content type, so a JSON body would need a preflight the
 * beacon can never send. Since the API is on a different origin
 * (`lms.edstellar.com` -> `lms-api.edstellar.com`) the beacon would have to
 * post `text/plain` and the endpoint would need a second body format. keepalive
 * sends real JSON with real CORS and still survives the document unloading.
 *
 * The cost of that choice is a 64 KB cap on an in-flight keepalive body, which
 * `MAX_FLUSH_BYTES` respects — and why the recorder flushes on a timer rather
 * than saving everything for the end.
 *
 * TELEMETRY MUST NEVER BREAK THE LESSON
 * -------------------------------------
 * Every public method swallows its own errors. If recording throws, the
 * learner's `SetValue` must still reach the runtime and still return "true";
 * a lost analytics row is an acceptable failure, a package that stops tracking
 * its own completion is not.
 */

/** The API's own `ArrayMaxSize(500)` on `deltas`. */
const MAX_BATCH = 500;

/** Keepalive bodies are capped at 64 KB by the fetch spec; stay clear of it. */
const MAX_FLUSH_BYTES = 48 * 1024;

/** Periodic flush, so a crashed or force-quit tab loses at most this much. */
const FLUSH_INTERVAL_MS = 20_000;

export function createDatamodelRecorder({ packageId, onError }) {
  /** Pending deltas, oldest first. */
  let buffer = [];
  /** Last value recorded per element, to drop consecutive no-op rewrites. */
  const lastValue = new Map();
  let timer = null;
  let flushing = null;
  let closed = false;

  const report = (message) => {
    // console, not the UI: the learner can do nothing about a telemetry
    // failure and an error banner over a lesson would be worse than the loss.
    if (typeof console !== "undefined") console.warn(`[scorm-telemetry] ${message}`);
    onError?.(message);
  };

  const record = (elementKey, elementValue) => {
    try {
      if (closed || typeof elementKey !== "string" || !elementKey) return;

      const value =
        elementValue === null || elementValue === undefined
          ? null
          : String(elementValue);

      /**
       * Consecutive identical writes to the same element are dropped.
       *
       * Packages re-set unchanged values constantly — `cmi.core.total_time` and
       * `cmi.core.lesson_location` are commonly written on every tick — and
       * storing those would grow the table without adding information: the
       * value did not change, and `created_at` on the previous row already
       * says when it last did. Every CHANGE is still recorded, and so is a
       * change back to a previous value.
       */
      if (lastValue.get(elementKey) === value) return;
      lastValue.set(elementKey, value);

      buffer.push({ element_key: elementKey, element_value: value });

      // Flush early rather than drop: the buffer must never exceed what the
      // endpoint will accept in one request.
      if (buffer.length >= MAX_BATCH) void flush();
    } catch (error) {
      report(`record failed: ${error?.message ?? error}`);
    }
  };

  /**
   * Takes as many of the oldest deltas as fit in one request.
   *
   * Size is measured on the serialized payload, not the count: one
   * `cmi.suspend_data` write can legally be 64,000 characters on its own, so a
   * count-based batch could still exceed the keepalive cap.
   */
  const takeBatch = () => {
    const batch = [];
    let bytes = 2; // the enclosing array
    while (buffer.length > 0 && batch.length < MAX_BATCH) {
      const next = buffer[0];
      const size = JSON.stringify(next).length + 1;
      if (batch.length > 0 && bytes + size > MAX_FLUSH_BYTES) break;
      batch.push(buffer.shift());
      bytes += size;
    }
    return batch;
  };

  const send = async (batch, { keepalive }) => {
    await apiClient(`/api/learner/scorm/${packageId}/datamodel`, {
      method: "POST",
      body: { deltas: batch },
      keepalive,
    });
  };

  /**
   * Ships pending deltas. Serialized on `flushing` so two triggers (a Commit
   * landing while the timer fires) cannot send the same delta twice or
   * interleave and reorder the timeline.
   */
  const flush = async ({ keepalive = false } = {}) => {
    if (flushing) return flushing;
    if (buffer.length === 0) return;

    flushing = (async () => {
      while (buffer.length > 0) {
        const batch = takeBatch();
        if (batch.length === 0) break;
        try {
          await send(batch, { keepalive });
        } catch (error) {
          /**
           * Put the batch back at the FRONT so order survives a transient
           * failure and the next flush retries it. The exception is a 4xx:
           * a rejected payload will be rejected again forever, and holding it
           * would block every later delta behind it. 401 is included — the
           * session has gone, and the player is about to redirect anyway.
           */
          const status = error?.status;
          if (status && status >= 400 && status < 500) {
            report(
              `dropped ${batch.length} delta(s) — API rejected them with ` +
                `${status}: ${error.message}`,
            );
          } else {
            buffer = batch.concat(buffer);
            report(`flush failed, will retry: ${error?.message ?? error}`);
          }
          break;
        }
      }
    })();

    try {
      await flushing;
    } finally {
      flushing = null;
    }
  };

  /**
   * The unload flush. Fire-and-forget on purpose: `pagehide` cannot await, so
   * the request is started with keepalive and the browser is left to finish it
   * after the document is gone.
   */
  const flushOnUnload = () => {
    try {
      if (buffer.length === 0) return;
      const batch = takeBatch();
      if (batch.length === 0) return;
      // Not awaited, and errors are swallowed — there is no page left to
      // report to, and an unhandled rejection during unload is noise.
      void send(batch, { keepalive: true }).catch(() => {});
    } catch {
      /* nothing useful can be done while unloading */
    }
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
  };

  /** Final flush plus teardown. Awaited by the player before it navigates. */
  const close = async () => {
    closed = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    await flush();
  };

  start();

  return {
    record,
    flush,
    flushOnUnload,
    close,
    /** Test/debug visibility — how much is waiting to be shipped. */
    get pending() {
      return buffer.length;
    },
  };
}

/**
 * Proxies a scorm-again API instance so every write is recorded.
 *
 * Both names are patched because the two SCORM versions use different ones:
 * 1.2 calls `LMSSetValue`, 2004 calls `SetValue`. `scorm-again` exposes only
 * the one for the version it was constructed as, so the loop patches whichever
 * exists rather than assuming.
 *
 * The original is always called and its return value always returned
 * unchanged, so the package sees identical runtime behaviour whether or not
 * telemetry is working.
 */
export function attachRecorder(api, recorder) {
  for (const name of ["SetValue", "LMSSetValue"]) {
    const original = api[name];
    if (typeof original !== "function") continue;
    const bound = original.bind(api);
    api[name] = (element, value) => {
      recorder.record(element, value);
      return bound(element, value);
    };
  }
  return api;
}
