/** Shared test wrappers — mirrors main.jsx provider stack for component tests. */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { TooltipProvider } from "../components/ui/tooltip";

/** Wrap children with TooltipProvider (required for Radix Tooltip in JSDOM tests). */
export function withTooltipProvider(children) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}

/** Wrap children with MemoryRouter (required for Link / useLocation in tests). */
export function withMemoryRouter(children) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

/** Router + Tooltip — common for dashboard/toolbar components. */
export function withRouterAndTooltip(children) {
  return (
    <MemoryRouter>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </MemoryRouter>
  );
}

/** QueryClient + MemoryRouter + TooltipProvider wrapper factory. */
export function makeTestWrapper(queryOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
      ...queryOptions,
    },
  });
  return function TestWrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}
