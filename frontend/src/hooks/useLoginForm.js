/** Form state and submission logic for the Login page. */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useLogin } from "../hooks/useAuth";
import { identifyUser } from "../lib/analytics";

function _identifyLoggedInUser(user) {
  identifyUser(user.id, {
    email: user.email,
    created_at: user.created_at,
    tier: user.tier ?? "free",
    has_resume: Boolean(user.resume_filename),
    application_count: user.application_count ?? 0,
    referral_source: user.referral_source ?? null,
  });
}

export function useLoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mutateAsync: signIn, isPending } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      if (!email.trim()) { setError("Email is required."); return; }
      if (!password) { setError("Password is required."); return; }
      try {
        const user = await signIn({ email: email.trim(), password });
        login(user);
        _identifyLoggedInUser(user);
        navigate("/dashboard", { replace: true });
      } catch (err) { setError(err?.message ?? "Incorrect email or password."); }
    },
    [email, password, signIn, login, navigate]
  );

  const handleGoogleSuccess = useCallback(() => navigate("/dashboard", { replace: true }), [navigate]);
  const handleGoogleError = useCallback((message) => setError(message), []);

  return { email, setEmail, password, setPassword, error, isPending, handleSubmit, handleGoogleSuccess, handleGoogleError };
}
