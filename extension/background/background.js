/** Service worker: API calls, token management, message routing. */

import { MSG, PAGE_TEXT_MAX_CHARS, JOB_DESCRIPTION_MAX_CHARS, MAX_RECENT, API_BASE } from "../shared/constants.js";

const TOKEN_KEY = "pipelined_auth_token";

let saveQueue = Promise.resolve();

// ── Token management ──────────────────────────────────────────────────────────

async function getToken() {
  try {
    const result = await chrome.storage.session.get(TOKEN_KEY);
    return result[TOKEN_KEY] || null;
  } catch (err) {
    console.error("[background] Failed to get token from session storage:", err);
    return null;
  }
}

async function setToken(token) {
  try {
    await chrome.storage.session.set({ [TOKEN_KEY]: token });
  } catch (err) {
    console.error("[background] Failed to set token in session storage:", err);
  }
}

async function clearToken() {
  try {
    await chrome.storage.session.remove(TOKEN_KEY);
  } catch (err) {
    console.error("[background] Failed to remove token from session storage:", err);
  }
}

async function refreshToken() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/extension-token`, {
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      await setToken(data.data.token);
      if (data.data.display_name) {
        try {
          await chrome.storage.local.set({ display_name: data.data.display_name });
        } catch (err) {
          console.error("[background] Failed to cache display name in local storage:", err);
        }
      }
      return true;
    }
  } catch {
    // Refresh failed — user must log in again
  }
  await clearToken();
  return false;
}

async function _parseResponse(response) {
  if (!response.ok) {
    try {
      const body = await response.json();
      return { error: body.error ?? { code: "REQUEST_FAILED", message: `Request failed with status ${response.status}` } };
    } catch {
      return { error: { code: "REQUEST_FAILED", message: `Request failed with status ${response.status}` } };
    }
  }
  try {
    return await response.json();
  } catch {
    return { error: { code: "INVALID_RESPONSE", message: "Server returned invalid JSON" } };
  }
}

async function fetchWithAuth(path, options = {}, _retried = false) {
  const token = await getToken();
  if (!token) {
    return { ok: false, status: 401, error: "NOT_AUTHENTICATED" };
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    if (_retried) {
      await clearToken();
      return { ok: false, status: 401, error: "SESSION_EXPIRED" };
    }
    const refreshed = await refreshToken();
    if (refreshed) {
      return fetchWithAuth(path, options, true);
    }
    await clearToken();
    return { ok: false, status: 401, error: "SESSION_EXPIRED" };
  }

  return _parseResponse(response);
}

// ── Save logic ────────────────────────────────────────────────────────────────

async function cacheRecentSave(application) {
  try {
    const entry = {
      id: application.id,
      company: application.company ?? "",
      role_title: application.role_title ?? "",
      stage: application.current_stage ?? application.stage ?? "Applied",
      date_applied: application.date_applied,
      talking_points: application.apply_pack?.talking_points ?? application.talking_points ?? [],
      fit_score: application.fit_score ?? application.ai_analysis?.fit_score ?? null,
    };
    const { recent_saves = [] } = await chrome.storage.local.get("recent_saves");
    const updated = [entry, ...recent_saves.filter((s) => s.id !== entry.id)].slice(0, MAX_RECENT);
    await chrome.storage.local.set({ recent_saves: updated });
  } catch (err) {
    console.error("[background] Failed to cache recent save in local storage:", err);
  }
}

async function updateCachedFitScore(appId, score) {
  try {
    const { recent_saves = [] } = await chrome.storage.local.get("recent_saves");
    const updated = recent_saves.map((save) =>
      save.id === appId ? { ...save, fit_score: score } : save
    );
    await chrome.storage.local.set({ recent_saves: updated });
  } catch (err) {
    console.error("[background] Failed to update fit score in local storage:", err);
  }
}

async function fetchFitScoreInBackground(appId) {
  const response = await fetchWithAuth(`/api/applications/${appId}/fit-score`, {
    method: "POST",
  });
  const score = response.data?.score;
  if (score == null) return;
  await updateCachedFitScore(appId, score);
}

async function executeSave(payload) {
  const { fields, boardId, pageText, jobDescription, sourceUrl } = payload;

  const body = {
    role_title: fields.role_title,
    company: fields.company_name,
    compensation: fields.compensation,
    company_type: fields.company_type,
    location: fields.location,
    remote_status: fields.remote_status,
    source_url: sourceUrl,
    source: "extension",
  };

  if (pageText && (!fields.role_title || !fields.company_name)) {
    body._page_text = pageText.slice(0, PAGE_TEXT_MAX_CHARS);
  }

  if (jobDescription) {
    body.job_description = jobDescription.slice(0, JOB_DESCRIPTION_MAX_CHARS);
  }

  const response = await fetchWithAuth("/api/applications", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (response.error?.code === "DUPLICATE_APPLICATION") {
    return { status: "duplicate", existingId: response.error.details.existing_id };
  }

  if (!response.data) {
    return { status: "error", message: response.error?.message || "Save failed" };
  }

  await cacheRecentSave(response.data);
  if (response.data.id) {
    fetchFitScoreInBackground(response.data.id).catch((err) => {
      console.error("[background] Background fit score fetch failed:", err);
    });
  }
  return {
    status: "success",
    application: response.data,
    parseEnhanced: Boolean(response.data?.parse_enhanced),
  };
}

async function executeContactSave(payload) {
  const { fields, sourceUrl } = payload;
  const body = {
    name: fields.name,
    headline: fields.headline,
    company: fields.company,
    linkedin_url: fields.linkedin_url || sourceUrl,
    source: "extension",
  };
  const response = await fetchWithAuth("/api/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.data) {
    return { status: "error", message: response.error?.message || "Save failed" };
  }
  return { status: "success", contact: response.data };
}

async function handleSave(payload) {
  const taskPromise = saveQueue.then(() =>
    executeSave(payload).catch((err) => {
      console.error("Save failed:", err);
      return { status: "error", message: "Save failed \u2014 try again" };
    })
  );
  saveQueue = taskPromise;
  return taskPromise;
}

// ── Message router ────────────────────────────────────────────────────────────

// Exported for test access only.
export { handleSave, fetchFitScoreInBackground };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ error: "Unauthorized" });
    return;
  }

  if (message.type === MSG.SAVE_APPLICATION) {
    handleSave(message.payload)
      .then(sendResponse)
      .catch(() => sendResponse({ status: "error", message: "Save failed" }));
    return true;
  }

  if (message.type === MSG.SAVE_CONTACT) {
    executeContactSave(message.payload)
      .then(sendResponse)
      .catch(() => sendResponse({ status: "error", message: "Save failed" }));
    return true;
  }

  if (message.type === MSG.GET_AUTH_STATUS) {
    Promise.all([getToken(), chrome.storage.local.get("display_name")])
      .then(([token, { display_name = "" }]) =>
        sendResponse({ authenticated: !!token, display_name })
      )
      .catch(() => sendResponse({ authenticated: false, display_name: "" }));
    return true;
  }

  if (message.type === MSG.GET_RECENT_SAVES) {
    chrome.storage.local
      .get("recent_saves")
      .then(({ recent_saves = [] }) =>
        sendResponse({ type: MSG.RECENT_SAVES, saves: recent_saves })
      )
      .catch(() => sendResponse({ type: MSG.RECENT_SAVES, saves: [] }));
    return true;
  }

  console.warn("[background] Unknown message type:", message.type);
  sendResponse({ success: false, error: "Unknown message type" });
});
