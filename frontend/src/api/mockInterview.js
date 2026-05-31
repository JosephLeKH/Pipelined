/** Mock interview — POST SSE streaming client. */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const CSRF_COOKIE_NAME = "pipelined_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";

function getCookie(name) {
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split("=")[1]);
  } catch {
    return null;
  }
}

function parseSseChunk(buffer, onEvent) {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";
  for (const part of parts) {
    const lines = part.split("\n");
    let eventType = "message";
    let dataLine = "";
    for (const line of lines) {
      if (line.startsWith("event:")) eventType = line.slice(6).trim();
      if (line.startsWith("data:")) dataLine += line.slice(5).trim();
    }
    if (!dataLine) continue;
    try {
      onEvent(eventType, JSON.parse(dataLine));
    } catch {
      onEvent(eventType, { message: dataLine });
    }
  }
  return remainder;
}

/**
 * Stream a mock interview turn or debrief.
 * @param {string} appId
 * @param {{ message?: string, history?: Array<{role:string, content:string}>, end_session?: boolean }} payload
 * @param {{ onToken: Function, onDone: Function, onDebrief?: Function, onError: Function, signal?: AbortSignal }} handlers
 */
export async function streamMockInterview(appId, payload, { onToken, onDone, onDebrief, onError, signal }) {
  const csrf = getCookie(CSRF_COOKIE_NAME);
  const headers = { "Content-Type": "application/json" };
  if (csrf) headers[CSRF_HEADER_NAME] = csrf;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/applications/${appId}/mock-interview`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    onError({ message: err?.message ?? "Network error" });
    return;
  }

  if (!response.ok) {
    let message = "Mock interview request failed";
    try {
      const body = await response.json();
      message = body?.error?.message ?? body?.detail ?? message;
    } catch {
      // ignore parse errors
    }
    onError({ message, status: response.status });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError({ message: "Streaming not supported" });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = parseSseChunk(buffer, (eventType, data) => {
      if (eventType === "token") onToken(data);
      else if (eventType === "done") onDone(data);
      else if (eventType === "debrief" && onDebrief) onDebrief(data);
      else if (eventType === "error") onError(data);
    });
  }
  if (buffer.trim()) {
    parseSseChunk(`${buffer}\n\n`, (eventType, data) => {
      if (eventType === "token") onToken(data);
      else if (eventType === "done") onDone(data);
      else if (eventType === "debrief" && onDebrief) onDebrief(data);
      else if (eventType === "error") onError(data);
    });
  }
}
