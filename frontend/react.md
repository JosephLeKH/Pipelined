# Style Guide — React & Frontend

**Scope:** All code in `/frontend`  
**Runtime:** React 18, Vite, TailwindCSS, TanStack React Query, Axios, react-window  
**Load alongside:** `STYLE_GUIDE.md` (universal rules)

---

## 1. Project Structure

```
frontend/
├── src/
│   ├── main.jsx              # Entry: root render, providers
│   ├── App.jsx               # Routes, layout shell, protected route wrapper
│   ├── api/
│   │   ├── client.js         # Axios instance (base URL, interceptors, credentials)
│   │   ├── applications.js   # API functions for /api/applications
│   │   ├── calendar.js       # API functions for /api/calendar/events
│   │   ├── jobs.js           # API functions for /api/jobs
│   │   └── auth.js           # API functions for /api/auth
│   ├── context/
│   │   └── AuthContext.jsx   # Auth provider: user state, login/logout, refresh
│   ├── hooks/
│   │   ├── useApplications.js  # React Query wrappers for application data
│   │   ├── useCalendar.js      # React Query wrappers for calendar data
│   │   └── useJobs.js          # React Query wrappers for job listings
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Calendar.jsx
│   │   ├── JobBoard.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── components/
│   │   ├── StatsBar.jsx
│   │   ├── ApplicationList.jsx
│   │   ├── FilterBar.jsx
│   │   ├── DetailPanel.jsx
│   │   ├── ManualAddForm.jsx
│   │   ├── CalendarGrid.jsx
│   │   ├── JobCard.jsx
│   │   ├── JobRow.jsx
│   │   └── NewEventForm.jsx
│   └── lib/
│       ├── constants.js       # App-wide constants (stage colors, breakpoints, timings)
│       └── utils.js           # Pure utility functions (date formatting, etc.)
├── tailwind.config.js
├── vite.config.js
├── package.json
└── index.html
```

### 1.1 Module Boundaries

| Directory | Rule |
|---|---|
| `api/` | Functions that call `client.get/post/patch/delete`. Return raw data (unwrapped from envelope). No React imports. |
| `hooks/` | React Query wrappers (`useQuery`, `useMutation`). Call `api/` functions. Return `{ data, isLoading, error }`. |
| `context/` | React Context providers only. Minimal — only auth state belongs here. |
| `pages/` | Route-level components. Compose from `components/`. Contain layout structure, not business logic. |
| `components/` | Reusable UI. Must not call `api/` directly — receive data via props or `hooks/`. |
| `lib/` | Pure functions with zero React imports. Testable without a DOM. |

---

## 2. Imports & Bundles

### 2.1 No Barrel Files

**CRITICAL.** This project does not use `index.js` re-export files. Every import points to the source file.

```jsx
// WRONG — barrel import
import { StatsBar, FilterBar, ApplicationList } from "../components";
import { Check, X, Menu } from "lucide-react";

// CORRECT — direct imports
import StatsBar from "../components/StatsBar";
import FilterBar from "../components/FilterBar";
import ApplicationList from "../components/ApplicationList";

import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import Menu from "lucide-react/dist/esm/icons/menu";
```

**Why:** Barrel files force bundlers to evaluate the entire module graph of a library. For `lucide-react`, that's 1,583 modules and ~2.8s of import time. Direct imports load only what you use.

**Libraries that MUST use direct imports:** `lucide-react`, `recharts`, `date-fns`, `lodash` (if added). Never import from the package root for these.

```jsx
// date-fns — CORRECT
import { format } from "date-fns/format";
import { startOfMonth } from "date-fns/startOfMonth";

// date-fns — WRONG
import { format, startOfMonth } from "date-fns";
```

### 2.2 Code Splitting

- **Every page is lazy-loaded.** Use `React.lazy` + `Suspense` at the route level.
- **Never lazy-load components below the page level** unless they contain heavy dependencies (e.g., a charting library). Lazy splitting every small component adds waterfall latency without meaningful bundle savings.

```jsx
// App.jsx — CORRECT
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const JobBoard = lazy(() => import("./pages/JobBoard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        {/* ... */}
      </Routes>
    </Suspense>
  );
}
```

---

## 3. Component Patterns

### 3.1 Component Anatomy

Every component follows this structure, in this order:

```jsx
/** Brief description of what this component renders and when. */

// 1. Imports (grouped per STYLE_GUIDE.md §1.3)
import { useState, useCallback } from "react";
import { useApplications } from "../hooks/useApplications";
import { STALE_APPLICATION_DAYS } from "../lib/constants";

// 2. Constants scoped to this component
const SORT_OPTIONS = ["date_applied", "company", "current_stage", "updated_at"];

// 3. Component definition (always named export + default export)
function ApplicationList({ onSelect }) {
  // 3a. Hooks (all hooks at the top, before any conditionals)
  const { data: applications, isLoading } = useApplications();
  const [sortBy, setSortBy] = useState("date_applied");

  // 3b. Derived state (computed from hooks, no useState needed)
  const sorted = useMemo(() => sortApplications(applications, sortBy), [applications, sortBy]);

  // 3c. Callbacks
  const handleSort = useCallback((field) => {
    setSortBy(field);
  }, []);

  // 3d. Early returns (loading, error, empty)
  if (isLoading) return <LoadingSkeleton />;
  if (!applications?.length) return <EmptyState />;

  // 3e. Render
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((app) => (
        <ApplicationRow key={app.id} application={app} onSelect={onSelect} />
      ))}
    </div>
  );
}

// 4. Sub-components (small, used only by this component — otherwise move to own file)
function ApplicationRow({ application, onSelect }) {
  // ...
}

// 5. Helper functions (pure, no hooks)
function sortApplications(apps, field) {
  // ...
}

export default ApplicationList;
```

### 3.2 Props

- **Destructure in the parameter list.** Never access `props.x` inside the function body.
- **No prop spreading** (`{...props}`). It hides the component's interface. Explicitly pass every prop.

```jsx
// CORRECT
function JobCard({ company, role, location, applyUrl, isStale, onApply }) {

// WRONG
function JobCard(props) {
  const { company, role } = props;

// WRONG — spreading
function JobCard({ className, ...rest }) {
  return <div className={className} {...rest} />;
```

### 3.3 Conditional Rendering

- **Use early returns for loading/error/empty states** (see §3.1 step 3d). Never nest ternaries for these.
- **For inline conditionals**, use `&&` for presence and ternary for branching. Never chain more than one ternary.

```jsx
// CORRECT — early returns for major states
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data.length) return <EmptyState />;

return (
  <div>
    {isStale && <StaleBadge />}
    {application.notes ? <NotesPreview text={application.notes} /> : null}
  </div>
);

// WRONG — nested ternaries
return isLoading ? <Skeleton /> : error ? <ErrorMessage /> : data.length === 0 ? <EmptyState /> : <List />;
```

---

## 4. State Management

### 4.1 State Placement Decision Tree

```
Is it server data (from an API)?
  → YES → React Query (useQuery / useMutation). NEVER useState for API data.

Is it shared across distant components (e.g., current user)?
  → YES → React Context (AuthContext only in this app).

Is it URL-representable (filters, sort, pagination)?
  → YES → URL search params (useSearchParams). Sync to sessionStorage for persistence.

Is it component-local UI state (open/close, hover, selection)?
  → YES → useState / useReducer in the component.

Default: useState. Reach for Context or global state only when prop drilling crosses 3+ levels.
```

### 4.2 React Query Rules

- **One custom hook per resource type.** All query/mutation logic for a resource lives in one hook file.
- **Never call `api/` functions directly from components.** Always go through the hooks layer.
- **Invalidate aggressively after mutations.** When a mutation succeeds, invalidate every query that could be affected.

```jsx
/** React Query hooks for application data. */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/applications";

const KEYS = {
  all: ["applications"],
  list: (filters) => ["applications", "list", filters],
  detail: (id) => ["applications", "detail", id],
  stats: ["applications", "stats"],
};

export function useApplications(filters = {}) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => api.fetchApplications(filters),
    staleTime: 30_000, // 30 seconds before refetch
  });
}

export function useApplication(id) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.fetchApplication(id),
    enabled: !!id, // don't fetch if id is null
  });
}

export function useApplicationStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: api.fetchStats,
    staleTime: 60_000,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      // Also invalidate stats since counts changed
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateApplication(id, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: KEYS.list() });
      queryClient.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}
```

### 4.3 Lazy State Initialization

**CRITICAL.** When `useState` receives a function call as its initial value, that function runs on **every render** — not just the first. Pass a function reference (arrow function) to defer execution.

```jsx
// WRONG — buildIndex() runs on every render
const [searchIndex, setSearchIndex] = useState(buildIndex(items));

// WRONG — JSON.parse runs on every render
const [prefs, setPrefs] = useState(JSON.parse(localStorage.getItem("prefs") || "{}"));

// CORRECT — arrow function defers to first render only
const [searchIndex, setSearchIndex] = useState(() => buildIndex(items));
const [prefs, setPrefs] = useState(() => {
  const stored = localStorage.getItem("prefs");
  return stored ? JSON.parse(stored) : {};
});
```

**When to use lazy init:** localStorage/sessionStorage reads, building data structures (Maps, Sets, indexes), any computation over arrays or objects. **When NOT to use:** simple primitives (`useState(0)`), direct prop references (`useState(props.value)`), empty structures (`useState([])`).

### 4.4 URL State for Filters

Filters on the dashboard and job board live in URL search params so they're shareable and bookmarkable.

```jsx
import { useSearchParams } from "react-router-dom";

function FilterBar({ onChange }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    stage: searchParams.getAll("stage"),
    companyType: searchParams.get("companyType"),
    remoteStatus: searchParams.get("remoteStatus"),
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
  };

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === "") {
      next.delete(key);
    } else if (Array.isArray(value)) {
      next.delete(key);
      value.forEach((v) => next.append(key, v));
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
    onChange(Object.fromEntries(next));
  };

  // ...
}
```

---

## 5. Performance Rules

### 5.1 Virtualization

**Mandatory for any list that can exceed 50 items.** `ApplicationList` and `JobBoard` listing views must use `react-window`.

```jsx
import { FixedSizeList } from "react-window";

function ApplicationList({ applications, onSelect }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ApplicationRow application={applications[index]} onSelect={onSelect} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={applications.length}
      itemSize={64}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### 5.2 Set/Map for Lookup-Heavy Operations

When filtering items against a list of IDs (e.g., "hide already applied" on the job board), convert the list to a `Set` first.

```jsx
// WRONG — O(n²): .includes() is O(n) per item, called m times
function filterApplied(listings, appliedUrls) {
  return listings.filter((l) => !appliedUrls.includes(l.applyUrl));
}

// CORRECT — O(n+m): Set.has() is O(1) per item
function filterApplied(listings, appliedUrls) {
  const appliedSet = new Set(appliedUrls);
  return listings.filter((l) => !appliedSet.has(l.applyUrl));
}
```

### 5.3 Min/Max Without Sorting

When computing stats or finding extremes (e.g., latest application, oldest event), never sort the full array.

```jsx
// WRONG — O(n log n) to find one value
function getLatestApplication(apps) {
  return [...apps].sort((a, b) => b.dateApplied - a.dateApplied)[0];
}

// CORRECT — O(n) single pass
function getLatestApplication(apps) {
  if (!apps.length) return null;
  let latest = apps[0];
  for (let i = 1; i < apps.length; i++) {
    if (apps[i].dateApplied > latest.dateApplied) latest = apps[i];
  }
  return latest;
}
```

### 5.4 Memoization

- **`useMemo`:** Use for expensive derived computations (sorting, filtering, transforming arrays). Do NOT use for simple lookups, string concatenation, or object creation with 1–2 fields.
- **`useCallback`:** Use for callbacks passed to memoized children or virtualized lists. Do NOT use for callbacks only used by non-memoized DOM elements.
- **`React.memo`:** Use for list item components rendered inside `react-window` or `.map()` with 20+ items. Do NOT wrap everything — measure first.

```jsx
// CORRECT — memoize because this filters + sorts 100+ items
const filtered = useMemo(
  () => applications.filter(matchesFilters).sort(compareFn),
  [applications, filters, sortBy]
);

// WRONG — memoizing a trivial computation
const fullName = useMemo(() => `${first} ${last}`, [first, last]);
```

---

## 6. Styling (TailwindCSS)

### 6.1 Rules

- **No custom CSS files** except for the global Tailwind directives (`@tailwind base/components/utilities`). All styling is Tailwind utility classes.
- **No inline `style` props** except for dynamic values that Tailwind can't handle (e.g., `style={{ height: dynamicHeight }}`).
- **No `@apply` in CSS.** If you need a reusable style, make a component.
- **Max ~10 classes per element.** If an element needs more, extract a component.

### 6.2 Responsive Pattern

Mobile-first. Use `sm:`, `md:`, `lg:` for progressively larger screens.

```jsx
// CORRECT — mobile base, scale up
<div className="flex flex-col gap-2 md:flex-row md:gap-4 lg:gap-6">

// WRONG — desktop base, scale down
<div className="flex flex-row gap-6 max-md:flex-col max-md:gap-2">
```

### 6.3 Stage Colors

Define stage colors as a constant map. Never hardcode hex values in components.

```jsx
// lib/constants.js
export const STAGE_COLORS = {
  "Applied":       { bg: "bg-blue-100",    text: "text-blue-800",    dot: "bg-blue-500" },
  "Phone Screen":  { bg: "bg-purple-100",  text: "text-purple-800",  dot: "bg-purple-500" },
  "Onsite":        { bg: "bg-amber-100",   text: "text-amber-800",   dot: "bg-amber-500" },
  "Offer":         { bg: "bg-green-100",   text: "text-green-800",   dot: "bg-green-500" },
  "Rejected":      { bg: "bg-red-100",     text: "text-red-800",     dot: "bg-red-500" },
};

export const DEFAULT_STAGE_COLOR = { bg: "bg-gray-100", text: "text-gray-800", dot: "bg-gray-500" };

// components/StagePill.jsx
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";

function StagePill({ stage }) {
  const color = STAGE_COLORS[stage] || DEFAULT_STAGE_COLOR;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
      {stage}
    </span>
  );
}
```

---

## 7. API Layer

### 7.1 Axios Client

```jsx
/** Axios instance with auth cookie support and token refresh interceptor. */

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send httpOnly cookies
  headers: { "Content-Type": "application/json" },
});

// Response interceptor: unwrap envelope + handle 401 refresh
let isRefreshing = false;
let pendingRequests = [];

client.interceptors.response.use(
  (response) => response.data.data, // unwrap { data: T } envelope
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then(() => client(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await client.post("/auth/refresh");
        pendingRequests.forEach(({ resolve }) => resolve());
        pendingRequests = [];
        return client(original);
      } catch (refreshError) {
        pendingRequests.forEach(({ reject }) => reject(refreshError));
        pendingRequests = [];
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data?.error || error);
  }
);

export { client as api };
```

### 7.2 API Functions

One file per resource. Functions are thin wrappers — no business logic.

```jsx
/** API functions for /api/applications. */

import { api } from "./client";

export async function fetchApplications(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val != null && val !== "") {
      if (Array.isArray(val)) val.forEach((v) => params.append(key, v));
      else params.set(key, val);
    }
  });
  return api.get(`/applications?${params}`);
}

export async function fetchApplication(id) {
  return api.get(`/applications/${id}`);
}

export async function createApplication(body) {
  return api.post("/applications", body);
}

export async function updateApplication(id, body) {
  return api.patch(`/applications/${id}`, body);
}

export async function deleteApplication(id) {
  return api.delete(`/applications/${id}`);
}

export async function fetchStats() {
  return api.get("/applications/stats");
}
```

---

## 8. Testing

### 8.1 Stack

- **Vitest** for test runner (Vite-native, same transforms as dev).
- **React Testing Library** for component tests. Query by role, text, label — never by class name or test ID unless no semantic alternative exists.
- **MSW** for API mocking. One handler file per resource.

### 8.2 Component Test Pattern

```jsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import ApplicationList from "./ApplicationList";

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe("ApplicationList", () => {
  it("should render company and role for each application", async () => {
    // MSW returns mock applications (configured in test setup)
    render(<ApplicationList onSelect={() => {}} />, { wrapper });

    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should show amber dot for stale applications", async () => {
    render(<ApplicationList onSelect={() => {}} />, { wrapper });

    const staleRow = await screen.findByText("OldCo");
    const row = staleRow.closest("[data-testid='application-row']");
    expect(within(row).getByTestId("stale-indicator")).toBeInTheDocument();
  });

  it("should call onSelect with application id when row is clicked", async () => {
    const onSelect = vi.fn();
    render(<ApplicationList onSelect={onSelect} />, { wrapper });

    await userEvent.click(await screen.findByText("Acme Corp"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "abc123" }));
  });
});
```
