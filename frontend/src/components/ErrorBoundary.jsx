/** React error boundary: catches unhandled render errors and shows a fallback UI. */

import { Component } from "react";
import { Link } from "react-router-dom";

import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import { Button } from "./ui/button";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

export function ErrorFallbackUI({ onRefresh }) {
  const handleRefresh = onRefresh ?? (() => window.location.reload());

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
        <AlertCircle aria-hidden="true" className="h-6 w-6 text-brand-700" />
      </div>
      <h2 className="text-lg font-semibold text-text-1">Something went wrong</h2>
      <p className="text-sm text-text-2">
        We&apos;ve logged the error. Try refreshing — if it keeps happening, email{" "}
        <a
          href="mailto:joseph@vimes.io"
          className={`text-brand-600 hover:text-brand-700 ${FOCUS_RING} rounded-sm`}
        >
          joseph@vimes.io
        </a>
        .
      </p>
      <div className="mt-2 flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleRefresh} className={FOCUS_RING}>
          Refresh
        </Button>
        <Button variant="default" size="sm" asChild className={FOCUS_RING}>
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return <ErrorFallbackUI onRefresh={this.handleReset} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
