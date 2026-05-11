/** Interview Prep Agent — EventSource connection factory. */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * Open an SSE stream for the interview prep agent.
 * Returns the EventSource instance so the caller can close it on cleanup.
 *
 * @param {string} appId
 * @param {{ onProgress: Function, onDone: Function, onError: Function }} handlers
 * @returns {EventSource}
 */
export function openInterviewPrepStream(appId, { onProgress, onDone, onError }) {
  const url = `${API_BASE_URL}/applications/${appId}/interview-prep`;
  const es = new EventSource(url, { withCredentials: true });

  es.addEventListener("progress", (e) => {
    try {
      onProgress(JSON.parse(e.data));
    } catch {
      // ignore malformed progress events
    }
  });

  es.addEventListener("done", (e) => {
    es.close();
    try {
      onDone(JSON.parse(e.data));
    } catch {
      onError({ message: "Received malformed briefing data." });
    }
  });

  es.addEventListener("error", (e) => {
    es.close();
    try {
      const data = e.data ? JSON.parse(e.data) : null;
      onError(data ?? { message: "Connection error. Please try again." });
    } catch {
      onError({ message: "Connection error. Please try again." });
    }
  });

  // Native onerror fires when the connection itself drops
  es.onerror = () => {
    if (es.readyState === EventSource.CLOSED) return;
    es.close();
    onError({ message: "Lost connection to the server. Please try again." });
  };

  return es;
}
