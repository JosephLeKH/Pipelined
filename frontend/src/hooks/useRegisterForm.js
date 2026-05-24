/** Form state and submission logic for the Register page. */

import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "../context/AuthContext";
import { useRegister } from "../hooks/useAuth";
import { identifyUser, trackEvent } from "../lib/analytics";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

function validateRegisterForm({ displayName, email, password }) {
  if (!displayName.trim()) return "Name is required.";
  if (!email.trim()) return "Email is required.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

function _identifyRegisteredUser(user) {
  identifyUser(user.id, {
    email: user.email,
    created_at: user.created_at,
    tier: user.tier ?? "free",
    has_resume: Boolean(user.resume_filename),
    application_count: 0,
    referral_source: user.referral_source ?? null,
  });
}

export function useRegisterForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") ?? null;
  const { login } = useAuth();
  const { mutateAsync: signUp, isPending } = useRegister();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      const validationError = validateRegisterForm({ displayName, email, password });
      if (validationError) { setError(validationError); return; }
      try {
        const user = await signUp({ email: email.trim(), password, display_name: displayName.trim(), referral_code: refCode });
        login(user);
        _identifyRegisteredUser(user);
        if (refCode) { trackEvent("referral_signup", { referral_code: refCode }); toast.success("Welcome! You were invited by a Pipelined user."); }
        navigate("/verify-email", { replace: true });
      } catch (err) { setError(err?.message ?? "Registration failed. Please try again."); }
    },
    [displayName, email, password, signUp, login, navigate, refCode]
  );

  const handleGoogleSuccess = useCallback(() => navigate("/today", { replace: true }), [navigate]);
  const handleGoogleError = useCallback((message) => setError(message), []);

  return { displayName, setDisplayName, email, setEmail, password, setPassword, error, isPending, handleSubmit, handleGoogleSuccess, handleGoogleError };
}
