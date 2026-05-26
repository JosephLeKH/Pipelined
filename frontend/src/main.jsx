/** Entry point: mounts React app with routing, query, and auth providers. */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { TooltipProvider } from "./components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App";
import { QUERY_STALE_TIME_MS } from "./lib/constants";
import { initAnalytics } from "./lib/analytics";
import { initAppearancePrefs } from "./lib/appearancePrefs";
import "./index.css";
import "./styles/animations.css";
import "./styles/marketing.css";

if (import.meta.env.VITE_POSTHOG_KEY) {
  initAnalytics();
}

initAppearancePrefs();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`/sw.js?v=${__BUILD_HASH__}`);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      retry: 1,
    },
  },
});

const TOAST_CLASS_NAMES = {
  toast:
    "w-[17.5rem] rounded-lg border border-border-1 bg-surface-0 text-text-1 shadow-[var(--shadow-popover)] px-4 py-3 text-sm",
  success: "border-l-2 border-l-[var(--status-success)] border-status-success/40",
  error: "border-l-2 border-l-brand-700 border-brand-700/40",
  title: "font-medium",
  description: "text-text-2 text-xs mt-0.5",
  actionButton:
    "bg-brand-600 text-white text-xs rounded-md px-2 py-1 hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1",
  cancelButton:
    "text-text-2 text-xs rounded-md px-2 py-1 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1",
  closeButton:
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1",
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TooltipProvider delayDuration={400}>
                <App />
                <Toaster
                  position="top-right"
                  offset={16}
                  closeButton
                  toastOptions={{
                    classNames: TOAST_CLASS_NAMES,
                    duration: 4000,
                  }}
                />
              </TooltipProvider>
            </AuthProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
