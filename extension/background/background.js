/** Service worker: API calls, token management, message routing. */

const TOKEN_KEY = "pipelined_auth_token";
const API_BASE = "https://api.pipelined.app";

// MSG constants are duplicated across background.js, content.js, and contact_banner.js
// because content scripts don't support ES modules. Keep these in sync manually.
const MSG = {
  SAVE_APPLICATION: "SAVE_APPLICATION",
  SAVE_CONTACT: "SAVE_CONTACT",
  SAVE_RESULT: "SAVE_RESULT",
  GET_AUTH_STATUS: "GET_AUTH_STATUS",
  AUTH_STATUS: "AUTH_STATUS",
  GET_RECENT_SAVES: "GET_RECENT_SAVES",
  RECENT_SAVES: "RECENT_SAVES",
};

let saveQueue = Promise.resolve();

// ── Token management ──────────────────────────────────────────────────────────

async function getToken() {
  const result = await chrome.storage.session.get(TOKEN_KEY);
  return result[TOKEN_KEY] || null;
}

async function setToken(token) {
  await chrome.storage.session.set({ [TOKEN_KEY]: token });
}

async function clearToken() {
  await chrome.storage.session.remove(TOKEN_KEY);
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
        await chrome.storage.local.set({ display_name: data.data.display_name });
      }
      return true;
    }
  } catch {
    // Refresh failed — user must log in again
  }
  await clearToken();
  return false;
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

  try {
    return await response.json();
  } catch {
    return { error: { code: "INVALID_RESPONSE", message: "Server returned invalid JSON" } };
  }
}

// ── Save logic ────────────────────────────────────────────────────────────────

async function cacheRecentSave(application) {
  const { recent_saves = [] } = await chrome.storage.local.get("recent_saves");
  const MAX_RECENT = 5;
  const updated = [application, ...recent_saves].slice(0, MAX_RECENT);
  await chrome.storage.local.set({ recent_saves: updated });
}

async function executeSave(payload) {
  const { fields, boardId, pageText, sourceUrl } = payload;

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
    body._page_text = pageText.slice(0, 3200);
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
  return { status: "success", application: response.data };
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

export { handleSave };

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MSG.SAVE_APPLICATION) {
    handleSave(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === MSG.SAVE_CONTACT) {
    executeContactSave(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === MSG.GET_AUTH_STATUS) {
    Promise.all([getToken(), chrome.storage.local.get("display_name")]).then(
      ([token, { display_name = "" }]) => sendResponse({ authenticated: !!token, display_name })
    );
    return true;
  }

  if (message.type === MSG.GET_RECENT_SAVES) {
    chrome.storage.local
      .get("recent_saves")
      .then(({ recent_saves = [] }) =>
        sendResponse({ type: MSG.RECENT_SAVES, saves: recent_saves })
      );
    return true;
  }
});
