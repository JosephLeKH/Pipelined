/** App shell: defines routes, lazy-loads pages, protects authenticated routes. */

import { lazy, Suspense, useEffect, useRef } from "react";
import { Routes, Route, Navigate, Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";

import { trackEvent } from "./lib/analytics";

import { useAuth } from "./context/AuthContext";
import ErrorBoundary, { ErrorFallbackUI } from "./components/ErrorBoundary";
import AppShell from "./components/shell/AppShell";
import FeedbackWidget from "./components/FeedbackWidget";
import UpgradePlanModal from "./components/UpgradePlanModal";
import { Button } from "./components/ui/button";
import { CHORD_DESTINATIONS, CHORD_TIMEOUT_MS } from "./lib/shortcuts";
import { OPEN_IMPORT_CSV_EVENT } from "./lib/constants";

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
      if (e.key === "i") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(OPEN_IMPORT_CSV_EVENT));
        pendingChord.current = null;
        clearTimeout(chordTimer.current);
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
const GmailCallback = lazy(() => import("./pages/GmailCallback"));
const Pricing = lazy(() => import("./pages/Pricing"));
const OfferComparison = lazy(() => import("./pages/OfferComparison"));
const Tags = lazy(() => import("./pages/Tags"));
const TodayPage = lazy(() => import("./pages/TodayPage"));
const PendingInboxPage = lazy(() => import("./pages/PendingInboxPage"));

/** Renders the confirmation page when ?token= is present, otherwise the pending page. */
function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();
  return searchParams.get("token") ? <VerifyEmailConfirm /> : <VerifyEmailPending />;
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Combines ProtectedRoute + PageWrapper for authenticated page routes. */
function ProtectedPage({ children }) {
  return <ProtectedRoute><PageWrapper>{children}</PageWrapper></ProtectedRoute>;
}

/** Wraps page content with a fade-in transition on mount. */
function PageWrapper({ children }) {
  return <div className="animate-fadeIn">{children}</div>;
}

/** Fires a page_viewed event on every route change and resets scroll position. */
function PageTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackEvent("page_viewed", { page_name: pathname });
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}

function RouteErrorFallback() {
  return <ErrorFallbackUI />;
}

function AuthenticatedShell() {
  const { user } = useAuth();
  if (!user) return null;
  return <GlobalChordShortcuts />;
}

function App() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:shadow-lg focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to main content
      </a>
      <Suspense fallback={<LoadingSpinner />}>
        <PageTracker />
        <AuthenticatedShell />
        <main id="main-content">
        <ErrorBoundary fallback={<RouteErrorFallback />}>
        <Routes>
        <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
        <Route path="/reset-password" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path="/verify-email" element={<PageWrapper><VerifyEmailRoute /></PageWrapper>} />
        <Route path="/auth/gmail/callback" element={<GmailCallback />} />
        <Route path="/pipeline/:slug" element={<PageWrapper><PublicPipeline /></PageWrapper>} />
        <Route path="/shared/timeline/:slug" element={<PageWrapper><PublicTimeline /></PageWrapper>} />
        <Route path="/pricing" element={<PageWrapper><Pricing /></PageWrapper>} />
        <Route element={<ProtectedPage><AppShell /></ProtectedPage>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="/offers" element={<OfferComparison />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/inbox/pending" element={<PendingInboxPage />} />
          <Route path="/jobs" element={<JobBoard />} />
        </Route>
        <Route path="/brief" element={<Navigate to="/today?brief=open" replace />} />
        </Routes>
        </ErrorBoundary>
        </main>
      </Suspense>
    </>
  );
}

export default App;
