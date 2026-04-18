/** App shell: defines routes, lazy-loads pages, protects authenticated routes. */

import { lazy, Suspense, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from "react-router-dom";

import { trackEvent } from "./lib/analytics";

import { useAuth } from "./context/AuthContext";
import CommandPalette from "./components/CommandPalette";
import EmailVerificationBanner from "./components/EmailVerificationBanner";
import OfflineBanner from "./components/OfflineBanner";
import FeedbackWidget from "./components/FeedbackWidget";
import ShortcutHelp from "./components/ShortcutHelp";
import UpgradePlanModal from "./components/UpgradePlanModal";
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
const PublicTimeline = lazy(() => import("./pages/PublicTimeline"));
const VerifyEmailPending = lazy(() => import("./pages/VerifyEmailPending"));
const VerifyEmailConfirm = lazy(() => import("./pages/VerifyEmailConfirm"));
const GithubCallback = lazy(() => import("./pages/GithubCallback"));
const Pricing = lazy(() => import("./pages/Pricing"));
const OfferComparison = lazy(() => import("./pages/OfferComparison"));

/** Renders the confirmation page when ?token= is present, otherwise the pending page. */
function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();
  return searchParams.get("token") ? <VerifyEmailConfirm /> : <VerifyEmailPending />;
}

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

/** Wraps page content with a fade-in transition on mount. */
function PageWrapper({ children }) {
  return <div className="animate-fadeIn">{children}</div>;
}

/** Fires a page_viewed event on every route change. */
function PageTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackEvent("page_viewed", { page_name: pathname });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-blue-600 focus:shadow-lg focus:ring-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>
      <OfflineBanner />
      <Suspense fallback={<LoadingSpinner />}>
        <PageTracker />
        <EmailVerificationBanner />
        <UpgradePlanModal />
        <CommandPalette />
        <ShortcutHelp />
        <GlobalChordShortcuts />
        <FeedbackWidget />
        <main id="main-content">
        <Routes>
        <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
        <Route path="/reset-password" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path="/verify-email" element={<PageWrapper><VerifyEmailRoute /></PageWrapper>} />
        <Route path="/auth/github/callback" element={<GithubCallback />} />
        <Route path="/jobs" element={<PageWrapper><JobBoard /></PageWrapper>} />
        <Route path="/pipeline/:slug" element={<PageWrapper><PublicPipeline /></PageWrapper>} />
        <Route path="/shared/timeline/:slug" element={<PageWrapper><PublicTimeline /></PageWrapper>} />
        <Route path="/pricing" element={<PageWrapper><Pricing /></PageWrapper>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageWrapper><Dashboard /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <PageWrapper><Calendar /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <PageWrapper><Analytics /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <PageWrapper><ActivityPage /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PageWrapper><Settings /></PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/offers"
          element={
            <ProtectedRoute>
              <PageWrapper><OfferComparison /></PageWrapper>
            </ProtectedRoute>
          }
        />
        </Routes>
        </main>
      </Suspense>
    </>
  );
}

export default App;
