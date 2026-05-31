/** localStorage write safety helper — catch quota exceeded and other errors. */

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (err) {
    const isQuota = err && (err.name === "QuotaExceededError" || err.code === 22);
    console.warn(`[safeStorage] Failed to set "${key}":`, err?.message);
    return { success: false, isQuota: Boolean(isQuota) };
  }
}

export function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
