/** Axios instance with auth cookie support and token refresh interceptor. */

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const SKIP_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/google"];

let isRefreshing = false;
let pendingRequests = [];

client.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (!body) return undefined;
    // List responses include a meta key — return the full envelope so callers can read next_cursor.
    // Single-resource and mutation responses wrap the payload in { data: ... } only.
    if ("meta" in body) return body;
    return body.data ?? body;
  },
  async (error) => {
    const original = error.config;
    const isAuthPath = SKIP_REFRESH_PATHS.some((p) => original.url?.includes(p));

    if (error.response?.status === 401 && !original._retry && !isAuthPath) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then(() => client(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await client.post("/auth/refresh");
        pendingRequests.forEach(({ resolve }) => resolve());
        pendingRequests = [];
        return client(original);
      } catch (refreshError) {
        pendingRequests.forEach(({ reject }) => reject(refreshError));
        pendingRequests = [];
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data?.error ?? error);
  }
);
