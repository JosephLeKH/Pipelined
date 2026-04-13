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

export async function forgotPassword(email) {
  return client.post("/auth/forgot-password", { email });
}

export async function resetPassword(token, new_password) {
  return client.post("/auth/reset-password", { token, new_password });
}

export async function updateCurrentUser(body) {
  return client.patch("/auth/me", body);
}

export async function uploadResume(file) {
  const form = new FormData();
  form.append("file", file);
  return client.post("/auth/resume", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function deleteResume() {
  return client.delete("/auth/resume");
}

export async function verifyEmail(token) {
  return client.post("/auth/verify-email", { token });
}

export async function resendVerification() {
  return client.post("/auth/resend-verification");
}
