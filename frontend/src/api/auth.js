/** API functions for /api/auth endpoints. */

import { client } from "./client";

export async function loginWithEmail(email, password) {
  return client.post("/auth/login", { email, password });
}

export async function registerWithEmail(email, password, display_name) {
  return client.post("/auth/register", { email, password, display_name });
}

export async function googleAuth(id_token) {
  return client.post("/auth/google", { id_token });
}

export async function logoutUser() {
  return client.post("/auth/logout");
}

export async function fetchCurrentUser() {
  return client.get("/auth/me");
}
