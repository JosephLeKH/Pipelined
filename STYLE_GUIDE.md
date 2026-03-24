# Pipelined — Style Guide

**Audience:** Autonomous coding agents  
**Stack:** FastAPI (Python 3.12) · React 18 · MongoDB (Motor) · Chrome Extension MV3 · TailwindCSS  
**Rule:** Every rule here is a hard constraint unless marked `[PREFER]`. If a rule conflicts with a library's documented API, the library wins.

---

## How to Use This Guide

Load the relevant sub-guides based on what you're editing:

| Working in | Load |
|---|---|
| `/backend/**` | This file + `style/python.md` + `style/mongodb.md` |
| `/frontend/**` | This file + `style/react.md` |
| `/extension/**` | This file + `style/extension.md` |
| Full-stack task | This file + all sub-guides |

---

## 1. Universal Principles

These apply to every file in the repo regardless of language.

### 1.1 Naming

```
Files:          snake_case.py, camelCase.jsx, camelCase.js
Directories:    snake_case (python), kebab-case (frontend/extension)
Classes:        PascalCase
Functions:      snake_case (Python), camelCase (JS/TS)
Constants:      SCREAMING_SNAKE_CASE
React components: PascalCase (both filename and export)
Database fields:  snake_case
API endpoints:    kebab-case nouns (/api/calendar-events, not /api/calendarEvents)
Env vars:         SCREAMING_SNAKE_CASE
```

### 1.2 File Size

- **Hard limit: 300 lines per file.** If a file exceeds 300 lines, split it. No exceptions.
- Functions: max 40 lines. If longer, extract helpers.
- This rule exists because agents parse smaller files faster and make fewer errors in bounded contexts.

### 1.3 Imports

- **Group imports in this order, separated by a blank line:**
  1. Standard library / language built-ins
  2. Third-party packages
  3. Internal absolute imports (from project root)
  4. Internal relative imports (from current module)

- **Never use wildcard imports** (`from x import *`, `import * as X from`). They make dependency graphs opaque.
- **Never use barrel file re-exports** in this project. Every import must point to the source file. See `style/react.md` §2.1 for frontend-specific barrel rules.

```python
# Python — CORRECT
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.dependencies import get_current_user
from database import get_collection
```

```jsx
// JavaScript — CORRECT
import { useState, useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
```

### 1.4 Comments

- **No obvious comments.** Never comment what the code does if the code is readable. Comment *why* when the reason is non-obvious.
- **Every module gets a single-line docstring** at the top explaining its purpose. This is mandatory — agents navigating the codebase rely on these to understand module boundaries without reading implementation.

```python
"""Duplicate guard logic for application creation."""
```

```jsx
/** Pipeline stage selector with history tracking. */
```

- **TODO format:** `TODO(scope): description` where scope is a module or feature name. Never leave bare `TODO` with no scope.

```python
# TODO(sync): Handle GitHub API pagination for repos with 1000+ listings.
```

### 1.5 Error Handling

- **Never swallow errors silently.** Every `try/except` and `try/catch` must either (a) log the error, (b) re-raise/re-throw, or (c) return a typed error to the caller. Empty catch blocks are forbidden.
- **Prefer narrow exception types** over broad catches. `except Exception` and `catch (e)` are code smells.
- **User-facing errors must be structured.** API returns `{ error: { code, message } }`. Frontend displays `message`. Agents must never surface raw stack traces.

### 1.6 No Magic Values

- Every number, string, or threshold that controls behavior must be a named constant defined at module scope or in `config.py` / a constants file.

```python
# WRONG
if (datetime.now(timezone.utc) - app.updated_at).days > 14:

# CORRECT
STALE_APPLICATION_DAYS = 14

if (datetime.now(timezone.utc) - app.updated_at).days > STALE_APPLICATION_DAYS:
```

```jsx
// WRONG
setTimeout(() => setBannerVisible(false), 8000);

// CORRECT
const BANNER_AUTO_DISMISS_MS = 8000;
setTimeout(() => setBannerVisible(false), BANNER_AUTO_DISMISS_MS);
```

### 1.7 No Dead Code

- Never commit commented-out code, unused imports, unreachable branches, or unused variables. Delete them. Version control is the archive.

### 1.8 Dependency Rules

- **No new dependencies without justification.** Before adding a package, check if the functionality exists in the standard library or an already-installed package. Adding a dep costs bundle size (frontend) or container size (backend).
- **Pin exact versions** in `requirements.txt` and `package.json` (not ranges).

### 1.9 Async Discipline

This codebase is async-first (FastAPI with Motor on the backend, React with React Query on the frontend). Blocking calls in async contexts are critical bugs.

- **Python:** Never call synchronous I/O (e.g., `requests.get`, `open().read()`, `pymongo` directly) inside an `async def` function. Use `httpx`, `motor`, and `aiofiles`.
- **JavaScript:** Never use synchronous XHR, `fs.readFileSync` in the extension service worker, or blocking loops that wait on network.

### 1.10 Security Defaults

- **Never interpolate user input into database queries.** Use parameterized queries (Motor's document filters are safe by default; never build query strings).
- **Never log secrets, tokens, or passwords.** Not even at DEBUG level.
- **Never disable CORS, CSRF, or TLS in production code.** Dev-only overrides must be behind an explicit `DEBUG` env var check.

---

## 2. Git & Code Organization

### 2.1 Commit Messages

```
<type>(<scope>): <imperative summary under 72 chars>

Types: feat, fix, refactor, test, docs, chore, perf
Scope: auth, applications, calendar, jobs, extension, frontend, infra
```

Examples:
```
feat(extension): add Ashby board DOM selectors
fix(applications): duplicate guard race condition on concurrent saves
perf(frontend): virtualize ApplicationList with react-window
test(auth): add JWT expiry and refresh rotation tests
```

### 2.2 Branch Naming

```
<type>/<scope>-<short-description>
```

Examples: `feat/extension-banner-ui`, `fix/auth-refresh-rotation`, `perf/dashboard-virtualization`

### 2.3 Monorepo Boundaries

```
/backend     → Python only. No JS/TS files.
/frontend    → JS/JSX only. No Python files.
/extension   → JS/CSS/HTML only. No Python files.
/shared      → JSON schemas, constants, or types shared across boundaries.
              No runtime code. Data definitions only.
```

**Never import across boundaries at runtime.** `/frontend` must never import from `/backend`. Shared types go in `/shared` as JSON Schema or duplicated with a `// SYNC: /shared/stages.json` comment.

---

## 3. Testing Conventions

### 3.1 Test File Location

- **Python:** `tests/` directory at backend root, mirroring the module structure. `tests/test_auth.py`, `tests/test_applications.py`, etc.
- **Frontend:** Co-located with source. `src/components/StatsBar.test.jsx` next to `StatsBar.jsx`.
- **Extension:** `tests/` directory at extension root.

### 3.2 Test Naming

```python
# Python: test_<behavior_under_test>
def test_duplicate_guard_returns_409_on_same_company_role():
def test_stage_transition_appends_to_history():
```

```jsx
// JS: describe("<ComponentOrModule>") + it("should <behavior>")
describe("ApplicationList", () => {
  it("should render amber dot for applications stale over 14 days", () => {
  it("should call onSort when column header is clicked", () => {
```

### 3.3 Test Structure

Every test follows **Arrange → Act → Assert**, separated by blank lines. No multi-assertion tests unless the assertions are tightly coupled (e.g., checking both `status_code` and response body from the same call).

```python
async def test_create_application_returns_201():
    # Arrange
    user = await create_test_user()
    payload = {"role_title": "SWE", "company": "Acme", "source": "manual"}

    # Act
    response = await client.post("/api/applications", json=payload, cookies=auth_cookies(user))

    # Assert
    assert response.status_code == 201
    assert response.json()["data"]["role_title"] == "SWE"
```

### 3.4 Mocking Rules

- **Mock at the boundary, not the implementation.** Mock HTTP calls (`httpx` responses, `msw` handlers), not internal functions.
- **Never mock the database in unit tests.** Use a real MongoDB test instance (separate database). This catches query bugs that mocks hide.
- **Exception:** Mock OpenAI and GitHub API responses. These are expensive, rate-limited, and nondeterministic.

---

## 4. API Contract

All agents building frontend, backend, or extension code must agree on this contract.

### 4.1 Response Envelope

```json
// Success (single)
{ "data": { ... } }

// Success (list)
{ "data": [ ... ], "meta": { "total": 142, "page": 1, "per_page": 50, "next_cursor": "abc123" } }

// Error
{ "error": { "code": "DUPLICATE_APPLICATION", "message": "You've already tracked SWE at Acme.", "details": { "existing_id": "..." } } }
```

### 4.2 HTTP Methods

```
GET     → Read. Never mutates. Cacheable.
POST    → Create. Returns 201 + created resource.
PATCH   → Partial update. Only send changed fields. Returns 200 + updated resource.
DELETE  → Remove. Returns 204 No Content.
PUT     → Not used in this API. Use PATCH.
```

### 4.3 Status Codes (Exhaustive)

```
200  OK                 → Successful read or update
201  Created            → Successful create
204  No Content         → Successful delete
400  Bad Request        → Malformed request syntax
401  Unauthorized       → Missing or invalid auth token
403  Forbidden          → Valid token, insufficient permissions
404  Not Found          → Resource does not exist
409  Conflict           → Duplicate guard violation
422  Unprocessable      → Valid syntax, invalid semantics (validation error)
429  Too Many Requests  → Rate limit exceeded
500  Internal Error     → Unhandled server error
503  Service Unavail    → Dependency down (MongoDB, OpenAI)
```

---

## Sub-Guides

| Guide | Path | Scope |
|---|---|---|
| Python & FastAPI | `style/python.md` | All `/backend` code: routes, services, schemas, middleware, config |
| React & Frontend | `style/react.md` | All `/frontend` code: components, hooks, pages, state, styling |
| MongoDB & Motor | `style/mongodb.md` | Database access patterns, queries, indexes, transactions |
| Chrome Extension | `style/extension.md` | Content scripts, service worker, popup, message passing |
