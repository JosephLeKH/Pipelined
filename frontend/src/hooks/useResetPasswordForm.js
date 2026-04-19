import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useResetPassword } from "./useAuth";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

const RESET_SUCCESS_REDIRECT_MS = 2000;

export function useResetPasswordForm(token) {
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

      if (!token) {
        setError("Reset token is missing. Please request a new reset link.");
        return;
      }
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
        await doReset({ token, new_password: newPassword });
        setSuccess(true);
        setTimeout(() => navigate("/login", { replace: true }), RESET_SUCCESS_REDIRECT_MS);
      } catch (err) {
        if (err?.code === "TOKEN_EXPIRED") {
          setError("This reset link has expired. Please request a new one.");
        } else if (err?.code === "TOKEN_INVALID") {
          setError("This reset link is invalid. Please request a new one.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
    },
    [token, newPassword, confirmPassword, doReset, navigate]
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
