/**
 * Shared MSW passthrough handlers for non-critical endpoints.
 *
 * These handlers return empty/default responses for endpoints that many
 * components fetch as side-effects (tags, notifications, templates, contacts,
 * stats, logo lookups) but that individual test suites don't need to assert
 * on. Spread these at the END of any setupServer() call so test-specific
 * handlers retain priority.
 *
 * Covered passthroughs and why they exist:
 *   GET /api/applications/tags         — TagInput fetches tags on mount; tests don't need real data
 *   GET /api/notifications             — NavBar/NotificationBell polls notifications; not under test
 *   GET /api/notifications/unread-count — Badge count fetch; not under test in most suites
 *   GET /api/templates/                — PrepSection fetches templates; not under test in most suites
 *   GET /api/applications              — Fallback for parameterised calls (e.g. ?stage=Offer&limit=1)
 *                                        from StatsBar or Dashboard widgets rendered in context
 *   GET /api/contacts                  — ContactsSection fetches contacts; not under test in most suites
 *   GET /api/applications/stats        — Fallback stats call from widgets rendered outside StatsBar tests
 *   GET /api/calendar/events           — Fallback events call when calendar is a side-rendered widget
 */

import { http, HttpResponse } from "msw";

export const passthroughHandlers = [
  // Tag autocomplete — return empty list
  http.get("/api/applications/tags", () =>
    HttpResponse.json({ data: [] })
  ),

  // Notification feed — return empty list
  http.get("/api/notifications", () =>
    HttpResponse.json({ data: [], meta: { count: 0, unread: 0 } })
  ),

  // Notification badge count — return zero
  http.get("/api/notifications/unread-count", () =>
    HttpResponse.json({ data: { count: 0 } })
  ),

  // Email / prep templates — return empty list
  http.get("/api/templates/", () =>
    HttpResponse.json({ data: [] })
  ),

  // Application list fallback (covers ?stage=Offer&limit=1 and similar filtered calls)
  http.get("/api/applications", () =>
    HttpResponse.json({ data: [], meta: { count: 0, next_cursor: null } })
  ),

  // Contacts for an application — return empty list
  http.get("/api/contacts", () =>
    HttpResponse.json({ data: [] })
  ),

  // Application stats widget fallback
  http.get("/api/applications/stats", () =>
    HttpResponse.json({
      data: {
        total_applied: 0,
        active_count: 0,
        response_rate: 0,
        avg_days_to_first_response: 0,
        stale_count: 0,
        applied_this_week: 0,
        current_streak: 0,
      },
    })
  ),

  // Calendar events fallback (covers ?application_id=... queries from DetailPanel sub-components)
  http.get("/api/calendar/events", () =>
    HttpResponse.json({ data: [], meta: { count: 0 } })
  ),

  http.get("/api/autopilot/pending", () =>
    HttpResponse.json({ data: [] })
  ),
];
