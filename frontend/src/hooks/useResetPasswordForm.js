import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useResetPassword } from "./useAuth";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

const RESET_SUCCESS_REDIRECT_MS = 2000;

export function useResetPasswordForm() {
  const navigate = useNavigate();
  const { mutateAsync: doReset, isPending } = useResetPassword();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");

      if (!newPassword) {
        setError("New password is required.");
        return;
      }
      if (newPassword.length < PASSWORD_MIN_LENGTH) {
        setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      try {
        await doReset({ new_password: newPassword });
        setSuccess(true);
        setTimeout(() => navigate("/login", { replace: true }), RESET_SUCCESS_REDIRECT_MS);
      } catch (err) {
        const code = err?.response?.data?.detail?.code;
        if (code === "TOKEN_MISSING") {
          setError("No reset session found. Please request a new reset link and complete it in the same browser.");
        } else if (code === "TOKEN_EXPIRED") {
          setError("This reset link has expired. Please request a new one.");
        } else if (code === "TOKEN_INVALID") {
          setError("This reset link is invalid. Please request a new one.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
    },
    [newPassword, confirmPassword, doReset, navigate]
  );

  return {
    newPassword,
    confirmPassword,
    error,
    success,
    isPending,
    setNewPassword,
    setConfirmPassword,
    handleSubmit,
  };
}
