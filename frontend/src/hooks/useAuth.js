/** React Query mutation hooks for authentication actions. */

import { useMutation } from "@tanstack/react-query";

import { loginWithEmail, registerWithEmail, googleAuth, logoutUser } from "../api/auth";

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }) => loginWithEmail(email, password),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ email, password, display_name }) =>
      registerWithEmail(email, password, display_name),
  });
}

export function useGoogleAuth() {
  return useMutation({
    mutationFn: ({ id_token }) => googleAuth(id_token),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: logoutUser,
  });
}
