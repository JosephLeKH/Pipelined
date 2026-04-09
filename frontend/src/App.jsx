/** App shell: defines routes, lazy-loads pages, protects authenticated routes. */

import { lazy, Suspense, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import CommandPalette from "./components/CommandPalette";
import ShortcutHelp from "./components/ShortcutHelp";
import { CHORD_TIMEOUT_MS } from "./lib/shortcuts";

const CHORD_DESTINATIONS = { d: "/dashboard", c: "/calendar", a: "/analytics", j: "/jobs" };
const IGNORED_CHORD_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function GlobalChordShortcuts() {
  const navigate = useNavigate();
  const pendingChord = useRef(null);
  const chordTimer = useRef(null);

  useEffect(() => {
    function handler(e) {
      const t = e.target;
      if (IGNORED_CHORD_TAGS.has(t.tagName) || t.isContentEditable) return;
      if (pendingChord.current === "g" && CHORD_DESTINATIONS[e.key]) {
        e.preventDefault();
        clearTimeout(chordTimer.current);
        pendingChord.current = null;
        navigate(CHORD_DESTINATIONS[e.key]);
        return;
      }
      if (e.key === "g") {
        pendingChord.current = "g";
        clearTimeout(chordTimer.current);
        chordTimer.current = setTimeout(() => { pendingChord.current = null; }, CHORD_TIMEOUT_MS);
      } else {
        pendingChord.current = null;
        clearTimeout(chordTimer.current);
      }
    }
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      clearTimeout(chordTimer.current);
    };
  }, [navigate]);

  return null;
}

const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Analytics = lazy(() => import("./pages/Analytics"));
const JobBoard = lazy(() => import("./pages/JobBoard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ActivityPage = lazy(() => import("./pages/Activity"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicPipeline = lazy(() => import("./pages/PublicPipeline"));

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CommandPalette />
      <ShortcutHelp />
      <GlobalChordShortcuts />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/pipeline/:slug" element={<PublicPipeline />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <ActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
