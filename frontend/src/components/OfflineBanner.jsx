/** Persistent top banner shown when the browser loses network connectivity. */

import { useState, useEffect } from "react";

import WifiOff from "lucide-react/dist/esm/icons/wifi-off";
import { BANNER_Z_OFFLINE } from "../lib/constants";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2";

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      className="flex h-9 items-center gap-3 border-b border-brand-800 bg-brand-700 px-4 text-xs text-white"
      style={{ zIndex: BANNER_Z_OFFLINE }}
    >
      <WifiOff size={15} aria-hidden="true" className="shrink-0" />
      <span>You are offline. Changes may not save.</span>
    </div>
  );
}

export default OfflineBanner;
