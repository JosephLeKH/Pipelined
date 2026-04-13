/** React Query mutation hooks for authentication actions. */

import { useMutation } from "@tanstack/react-query";

import { loginWithEmail, registerWithEmail, googleAuth, logoutUser, forgotPassword, resetPassword, updateCurrentUser, uploadResume, deleteResume, fetchCurrentUser, verifyEmail, resendVerification } from "../api/auth";
import { useAuth } from "../context/AuthContext";

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

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }) => forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, new_password }) => resetPassword(token, new_password),
  });
}

export function useUpdateUser() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (body) => updateCurrentUser(body),
    onSuccess: (data) => {
      updateUser(data);
    },
  });
}

export function useUploadResume() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (file) => uploadResume(file),
    onSuccess: async () => {
      const updated = await fetchCurrentUser();
      updateUser(updated);
    },
  });
}

export function useDeleteResume() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: deleteResume,
    onSuccess: async () => {
      const updated = await fetchCurrentUser();
      updateUser(updated);
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: ({ token }) => verifyEmail(token),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: resendVerification,
  });
}
