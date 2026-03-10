# Technical Design Document: Pipelined

> A Native iOS Internship Tracker

**Version:** 2.0  
**Date:** March 9, 2026  
**Author:** Joseph  
**Platform:** iOS (Swift / SwiftUI)  
**Status:** Draft  
**Target:** MVP in 4 weeks

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem & Solution](#2-problem--solution)
3. [User Personas](#3-user-personas)
4. [Definitions & Terminology](#4-definitions--terminology)
5. [Product Requirements](#5-product-requirements)
6. [UX Design Decisions](#6-ux-design-decisions)
7. [Architecture & System Design](#7-architecture--system-design)
8. [Data Models](#8-data-models)
9. [Core Components (Swift)](#9-core-components-swift)
10. [Implementation Plan](#10-implementation-plan)
11. [File Structure](#11-file-structure)
12. [Test Cases](#12-test-cases)
13. [Edge Cases](#13-edge-cases)
14. [Out of Scope (v1)](#14-out-of-scope-v1)
15. [Future Extensions](#15-future-extensions)
16. [Dependencies](#16-dependencies)
17. [Security & Privacy](#17-security--privacy)
18. [Rollout Strategy](#18-rollout-strategy)
19. [Success Metrics](#19-success-metrics)
20. [Open Questions](#20-open-questions)

---

## 1. Executive Summary

Pipelined is a native iOS application that helps students discover internship opportunities and track their applications through customizable interview pipelines. Unlike rigid trackers that force users into fixed stages, Pipelined recognizes that every company's interview process is different—some have OAs, some have AI screens, some have 5 technical rounds. Users build their own pipeline for each application by dragging from a library of common stages.

### Core Value Proposition

- **Discovery:** Aggregated feed from crowd-sourced GitHub repos, updated every few hours.
- **Flexibility:** Per-application custom pipelines built from draggable stage templates.
- **Simplicity:** Native iOS experience—fast, fluid, feels like an Apple app.
- **Accountability:** Push notifications for deadlines and stale applications.

### Key Specs

| Attribute | Value |
|-----------|-------|
| Platform | iOS 17+ (iPhone) |
| Language | Swift 5.9+ |
| UI Framework | SwiftUI |
| Backend | Firebase (Auth, Firestore, Cloud Functions, FCM) |
| Data Sources | GitHub repos (speedyapply/2026-SWE-College-Jobs, vanshb03/Summer2026-Internships) |
| Auth | Sign in with Apple (primary), Google Sign-In (secondary) |
| Timeline | 4 weeks to TestFlight |
| Monetization | Free (freemium later) |

---

## 2. Problem & Solution

### 2.1 The Problem

Students applying to tech internships face three compounding problems:

**1. Discovery is fragmented**

Jobs are scattered across LinkedIn, Handshake, company career pages, and crowd-sourced lists. Students waste hours checking multiple sources daily, often missing new postings.

**2. Tracking is chaotic**

Most students use spreadsheets or Notion databases. These tools aren't built for job tracking—they require manual setup, don't send reminders, and become unwieldy at scale. The average student applies to 50-200 internships; spreadsheets break down.

**3. Interview processes vary wildly**

Every company has a different process. Some start with an OA, some go straight to recruiter calls. Some have AI coding screens (Karat, Codility), some have AI chat screens (HireVue). Some have 2 technical rounds, some have 5. Fixed-stage trackers (Applied → Interview → Offer) don't capture this reality, leaving students to hack around the system or abandon tracking altogether.

### 2.2 The Solution

Pipelined solves all three problems with a mobile-first approach:

**Unified Feed**

Aggregate internship postings from the most reliable crowd-sourced GitHub repos into a single, searchable, filterable feed. No more tab-switching between sources.

**One-Tap Save**

See a job you like? Tap "Track" and it's in your pipeline. Start with a single "Saved" stage. No friction, no forms.

**Build Your Pipeline**

As you progress, drag stages from a library of common interview steps (OA, Recruiter Call, Tech Round 1, etc.) to build that application's unique pipeline. Move between stages with a tap. Each application tells its own story.

**Never Miss a Deadline**

Set deadlines on any stage (not just the application). Get push notifications 3 days, 1 day, and day-of. Stale applications (no activity in 2 weeks) get gentle nudges.

---

## 3. User Personas

### Primary: "Alex the Active Applier"

- Junior CS student at a state school
- Applying to 100+ internships for Summer 2026
- Currently uses a Google Sheet with 15 columns
- Checks SimplifyJobs repo daily, manually
- Has lost track of where they are with 3 companies
- Missed an OA deadline last cycle because it was buried in email
- **Wants:** Single source of truth, mobile access, deadline reminders

### Secondary: "Sam the Strategic Applier"

- Sophomore at a target school
- Applying to 30-50 carefully selected companies
- Tracks referral contacts, prep notes, and interview feedback
- Wants detailed per-company tracking, not just status
- **Values:** Organization, notes, seeing the full picture per application

### Anti-Persona: "Casey the Casual"

- Only applying to 5-10 companies
- Prefers to keep it all in their head
- Doesn't need a dedicated tool—Notes app is fine
- **We are NOT designing for Casey. That's okay.**

---

## 4. Definitions & Terminology

| Term | Definition |
|------|------------|
| Job | An internship posting from the aggregated feed. Immutable reference data. |
| Application | A user's tracked instance of a job (or manual entry). Contains stages, notes, metadata. |
| Stage | A single step in an interview process (e.g., "OA", "Phone Screen", "Tech Round 1"). |
| Stage Template | A predefined stage type from the system library that users drag onto applications. |
| Pipeline | The ordered sequence of stages for a single application. |
| Stage Library | The collection of all available stage templates, organized by category. |
| Current Stage | The stage the user is actively in for a given application. |
| Completed Stage | A stage the user has passed (marked complete). |
| Deadline | A date/time attached to a stage (e.g., OA due date, offer decision deadline). |
| Feed | The main screen showing aggregated job postings. |
| Scraper | Cloud Function that parses GitHub repos into structured job data. |

---

## 5. Product Requirements

### 5.1 Functional Requirements

#### FR-1: Authentication

| ID | Requirement |
|----|-------------|
| FR-1.1 | User can sign in with Apple (required for App Store, primary method). |
| FR-1.2 | User can sign in with Google. |
| FR-1.3 | User can sign out. |
| FR-1.4 | Session persists across app restarts (secure token storage in Keychain). |
| FR-1.5 | New users get a Firestore document created on first sign-in. |
| FR-1.6 | User can delete their account and all associated data. |

#### FR-2: Job Feed

| ID | Requirement |
|----|-------------|
| FR-2.1 | User sees a scrollable feed of internship postings. |
| FR-2.2 | Each job card shows: company logo (if available), company name, role title, location, posted date. |
| FR-2.3 | Jobs posted in last 48 hours show a "NEW" badge. |
| FR-2.4 | User can pull-to-refresh to fetch latest data. |
| FR-2.5 | User can search feed by keyword (company, role). |
| FR-2.6 | User can filter by: location (Remote, specific cities), sponsorship status, season (Summer, Fall, Winter, Spring, Offseason). |
| FR-2.7 | User can tap a job to view full details. |
| FR-2.8 | Job detail view shows: all metadata, application URL (external link), "Track This" CTA. |
| FR-2.9 | If user is already tracking a job, show "Already Tracking" badge instead of CTA. |
| FR-2.10 | Feed paginates (infinite scroll) for performance. |

#### FR-3: Stage System (Core Innovation)

| ID | Requirement |
|----|-------------|
| FR-3.1 | System provides a library of predefined stage templates organized by category. |
| FR-3.2 | Stage categories: Pre-Application, Screening, Technical, Behavioral, Final, Outcome. |
| FR-3.3 | Stage templates include (see table below). |
| FR-3.4 | User can add a stage to an application by selecting from the stage library. |
| FR-3.5 | User can reorder stages within an application via drag-and-drop. |
| FR-3.6 | User can remove a stage from an application. |
| FR-3.7 | User can mark a stage as "Complete" (checkmark) or "Current" (highlighted). |
| FR-3.8 | Each stage can have an optional deadline (date + time). |
| FR-3.9 | Each stage can have optional notes. |
| FR-3.10 | User can add the same stage type multiple times (e.g., Tech Round 1, Tech Round 2). |
| FR-3.11 | When tracking a new job, app auto-creates with a single "Saved" stage. |
| FR-3.12 | Quick-advance: User can tap a stage and select "Move to [next logical stage]" for common progressions. |

**Stage Templates:**

| Category | Stage Name | Description |
|----------|------------|-------------|
| Pre-Application | Saved | Job saved but not yet applied |
| Pre-Application | Preparing Materials | Working on resume/cover letter |
| Pre-Application | Waiting for Referral | Seeking internal referral |
| Screening | Applied | Application submitted |
| Screening | OA (Online Assessment) | Received OA link |
| Screening | AI Coding Screen | Automated coding interview (Karat, etc.) |
| Screening | AI Chat Screen | Video interview (HireVue, etc.) |
| Screening | Recruiter Call | Initial recruiter conversation |
| Screening | Phone Screen | Technical phone screen |
| Technical | Technical Round 1 | First technical interview |
| Technical | Technical Round 2 | Second technical interview |
| Technical | Technical Round 3 | Third technical interview |
| Technical | System Design | System design interview |
| Technical | Take-Home Project | Coding project assignment |
| Behavioral | Behavioral Round | Behavioral/culture fit interview |
| Behavioral | Hiring Manager | Hiring manager interview |
| Final | Team Matching | Matching with specific team |
| Final | Final Round | Final interview or onsite |
| Final | Reference Check | Reference check stage |
| Final | Background Check | Background check stage |
| Outcome | Offer Received | Received offer |
| Outcome | Offer Accepted | Accepted the offer |
| Outcome | Offer Declined | Declined the offer |
| Outcome | Rejected | Rejected at any stage |
| Outcome | Withdrawn | User withdrew application |
| Outcome | Ghosted | No response for extended period |

#### FR-4: Application Tracking

| ID | Requirement |
|----|-------------|
| FR-4.1 | User can view all tracked applications in a list or board view. |
| FR-4.2 | List view shows applications sorted by: last updated, deadline, company name. |
| FR-4.3 | Each application card shows: company, role, current stage, days since last update. |
| FR-4.4 | User can filter applications by: current stage category, has deadline, stale (no update in 14+ days). |
| FR-4.5 | User can tap an application to view/edit its full pipeline and details. |
| FR-4.6 | User can delete an application (with confirmation). |
| FR-4.7 | User can manually add an application not from the feed (custom company, role). |
| FR-4.8 | Application detail view shows: job info, full stage pipeline, notes, metadata. |

#### FR-5: Application Metadata

| ID | Requirement |
|----|-------------|
| FR-5.1 | Each application stores: company, role, location, application URL. |
| FR-5.2 | Optional metadata: salary/compensation, notes, tags. |
| FR-5.3 | User can add custom tags to applications (e.g., "Dream Company", "Backup", "FAANG"). |
| FR-5.4 | User's tag library persists across applications (autocomplete). |
| FR-5.5 | Timestamps: created, last updated, applied date (when Applied stage marked complete). |

#### FR-6: Deadlines & Notifications

| ID | Requirement |
|----|-------------|
| FR-6.1 | Any stage can have a deadline attached. |
| FR-6.2 | Deadlines appear on a calendar view. |
| FR-6.3 | User receives push notification 3 days before a deadline. |
| FR-6.4 | User receives push notification 1 day before a deadline. |
| FR-6.5 | User receives push notification on deadline morning. |
| FR-6.6 | User can disable notifications per-application or globally. |
| FR-6.7 | Tapping a notification deep-links to that application. |
| FR-6.8 | Stale application reminder: if no stage update in 14 days, gentle nudge. |

#### FR-7: Calendar View

| ID | Requirement |
|----|-------------|
| FR-7.1 | Monthly calendar shows dots on dates with deadlines. |
| FR-7.2 | Tapping a date shows list of applications/stages due. |
| FR-7.3 | Calendar syncs with application stage deadlines in real-time. |
| FR-7.4 | User can navigate between months. |

#### FR-8: Statistics Dashboard

| ID | Requirement |
|----|-------------|
| FR-8.1 | User sees total applications tracked. |
| FR-8.2 | User sees breakdown by outcome stage (Offers, Rejected, Ghosted, In Progress). |
| FR-8.3 | User sees "response rate": applications that progressed past Applied / total applied. |
| FR-8.4 | User sees "interview rate": applications that reached any Technical stage / total applied. |
| FR-8.5 | Stats update in real-time. |

### 5.2 Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-1 | Performance | Feed loads in < 1.5s on WiFi, < 3s on LTE. App launch < 2s. |
| NFR-2 | Responsiveness | All interactions feel instant (< 100ms perceived latency). Use optimistic UI updates. |
| NFR-3 | Scalability | Support 10,000 DAU without architecture changes. |
| NFR-4 | Reliability | Firebase SLA (99.95%). Graceful offline mode. |
| NFR-5 | Security | All data in transit via TLS. Firestore rules enforce user isolation. |
| NFR-6 | Privacy | No third-party tracking. Minimal data collection. Comply with App Store guidelines. |
| NFR-7 | Accessibility | Full VoiceOver support. Dynamic Type. Min 44pt touch targets. WCAG AA contrast. |
| NFR-8 | Offline | Cache feed and applications locally. Queue writes, sync on reconnect. |
| NFR-9 | Battery | No background activity except push notifications. Efficient Firestore listeners. |

---

## 6. UX Design Decisions

### 6.1 Information Architecture

The app has 4 primary tabs:

| Tab | Purpose |
|-----|---------|
| Feed | Discovery. Browse new jobs. Search and filter. Primary entry point for tracking. |
| Pipeline | Management. View all tracked applications. Filter by status. Primary workspace. |
| Calendar | Time-based view. See upcoming deadlines. Plan the week. |
| Profile | Settings, stats, and account. Secondary destination. |

### 6.2 The Stage System UX

**Design Goal**

Make it dead simple to track a job, then progressively add detail as the process unfolds. Never force users to set up stages upfront. Let the pipeline emerge organically.

**Core Interaction**

1. User saves a job → starts with single "Saved" stage.
2. User taps "Add Stage" → sees categorized stage library (bottom sheet).
3. User taps a stage to add it → stage appears in pipeline.
4. User can reorder stages via drag handle.
5. User taps a stage → marks complete, sets deadline, adds notes.
6. Current stage is visually highlighted (filled circle vs outlined).

**Visual Design**

Pipeline displayed as vertical timeline (not horizontal—mobile-first). Each stage is a card with: icon, name, status indicator, deadline (if set). Completed stages show checkmark. Current stage is highlighted. Future stages are dimmed. Swipe left on a stage to delete. Long-press to reorder.

**Quick Actions**

Common progressions have shortcuts. If user is on "Applied", offer quick-add for "OA" or "Recruiter Call". If on "Offer Received", offer "Accept" or "Decline". Reduces taps for happy paths.

### 6.3 Feed Design

**Job Card**

Clean, scannable cards. Company name in bold. Role title. Location + date posted on secondary line. Tapping anywhere opens detail. No "Track" button on card—that's in detail view to reduce accidental taps.

**Filtering Philosophy**

Filters should be additive, not exclusive. "Remote + San Francisco" means jobs that are remote OR in SF, not jobs that are somehow both. Clear "X active filters" badge. Easy clear-all.

**Empty States**

- If feed is empty due to filters: "No jobs match your filters. Try adjusting or clearing them."
- If feed is genuinely empty: "No jobs yet. Pull to refresh or check back later."

### 6.4 Notification Strategy

Notifications should be helpful, not annoying. Philosophy:

- Never notify for something the user already knows.
- Deadline reminders are opt-out by default (most want them).
- Stale reminders are gentle ("Haven't heard back from X? Might be worth following up.").
- All notifications deep-link to the relevant application.
- User can disable per-application if a company is slow but expected.

### 6.5 Design Principles

| Principle | Description |
|-----------|-------------|
| Speed over features | Ship a focused MVP. Better to do 5 things well than 20 things poorly. |
| Mobile-first, mobile-only (for now) | Optimize for iPhone. No iPad-specific layouts in v1. No web. |
| Native feel | Use standard iOS patterns (SF Symbols, system fonts, haptics). Should feel like Apple made it. |
| Progressive disclosure | Start simple, reveal complexity as needed. Don't show all 25 stage types upfront. |
| Forgiveness | Undo for destructive actions. Confirmations for irreversible ones (delete account). |

---

## 7. Architecture & System Design

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ARCHITECTURE                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────┐       ┌────────────────────────────────────────────────┐ │
│   │   GitHub Repos   │       │                  Firebase                       │ │
│   │                  │       │                                                 │ │
│   │ speedyapply/     │       │  ┌──────────┐  ┌───────────┐  ┌─────────────┐  │ │
│   │ 2026-SWE-College │──────▶│  │  Cloud   │  │ Firestore │  │    FCM      │  │ │
│   │                  │       │  │ Functions│─▶│  (NoSQL)  │  │   (Push)    │  │ │
│   │ vanshb03/        │       │  └──────────┘  └───────────┘  └─────────────┘  │ │
│   │ Summer2026-      │       │       │              │               │          │ │
│   │ Internships      │       │       │              │               │          │ │
│   │ (+ offseason)    │       │       ▼              ▼               ▼          │ │
│   └──────────────────┘       │  ┌────────────────────────────────────────┐     │ │
│         │                    │  │          Firebase Auth                 │     │ │
│         │ Scrape (4hr)       │  │     (Apple + Google Sign-In)           │     │ │
│         ▼                    │  └────────────────────────────────────────┘     │ │
│   ┌──────────────────┐       └────────────────────────────────────────────────┘ │
│   │ Raw README.md    │                           │                              │
│   │ (Markdown table) │                           │ HTTPS                        │
│   └──────────────────┘                           ▼                              │
│                              ┌────────────────────────────────────────────────┐ │
│                              │              iOS App (Swift/SwiftUI)            │ │
│                              │                                                 │ │
│                              │   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │ │
│                              │   │  Feed  │ │Pipeline│ │Calendar│ │Profile │  │ │
│                              │   │  Tab   │ │  Tab   │ │  Tab   │ │  Tab   │  │ │
│                              │   └────────┘ └────────┘ └────────┘ └────────┘  │ │
│                              │                                                 │ │
│                              │   Architecture: MVVM + Repository Pattern       │ │
│                              │   Local Cache: SwiftData                        │ │
│                              │   Networking: Firebase iOS SDK                  │ │
│                              └────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Data Sources

| Repository | Priority | Notes |
|------------|----------|-------|
| speedyapply/2026-SWE-College-Jobs | Primary | Actively maintained, includes FAANG section, good structure |
| vanshb03/Summer2026-Internships | Primary | Large community, frequent updates |
| vanshb03/Summer2026-Internships (OFFSEASON_README.md) | Primary | Offseason/fall/winter/spring internships |

### 7.3 Data Flow

**Job Ingestion (Server-Side)**

1. Cloud Scheduler triggers scrapeJobs function every 4 hours.
2. Function fetches raw README.md files from each GitHub repo via GitHub API.
3. Parser extracts job rows from markdown tables (handles multiple formats).
4. Deduplication via hash of (company + role + location + season).
5. New jobs inserted, existing jobs updated (updatedAt), removed jobs marked inactive.
6. Logs parse errors for monitoring; alerts if >20% failure rate.

**User Application Flow (Client-Side)**

1. User browses feed (paginated reads from Firestore jobs collection).
2. User taps job detail → "Track This" → creates Application in users/{uid}/applications.
3. Application starts with single Stage: { type: "saved", status: "current" }.
4. User adds stages from library → stages array updated.
5. User marks stage complete → status: "completed", moves to next current.
6. User sets deadline → stage.deadline populated; triggers notification scheduling.
7. Changes sync to Firestore; local SwiftData cache for offline.

### 7.4 Design Decisions

| Decision | Rationale |
|----------|-----------|
| Swift/SwiftUI over React Native | Best-in-class iOS performance and feel. Smaller bundle. SwiftUI is mature enough for production. No need for Android in v1. Trade-off: No code sharing with web. |
| MVVM Architecture | Clean separation for SwiftUI. ViewModels manage state, Views are dumb. Repositories abstract data sources. Easy to test. |
| SwiftData for local cache | Apple's modern persistence. Integrates seamlessly with SwiftUI. Replaces Core Data boilerplate. Offline-first possible. |
| Firebase over custom backend | Auth, Firestore, Functions, FCM all integrated. Fast to build. No server management. Trade-off: Vendor lock-in. |
| Stages as embedded array | Simpler than subcollection. Single document read gets full pipeline. Firestore limit (1MB doc) is plenty for stages. |
| Stage templates as static config | Ship stage library in app bundle. No network call needed. Update via app release. Simpler than dynamic config. |

---

## 8. Data Models

### 8.1 Firestore Schema

**Collection: jobs**

```
jobs/{jobId}
├── id: string
├── company: string
├── role: string
├── location: string
├── url: string (application URL)
├── season: string ("summer2026" | "fall2025" | "winter2026" | "spring2026" | "offseason")
├── datePosted: timestamp | null
├── deadline: timestamp | null
├── sponsorship: string | null ("Yes" | "No" | "Unknown")
├── source: string ("speedyapply" | "vanshb03" | "vanshb03-offseason")
├── sourceHash: string (dedup key)
├── createdAt: timestamp
├── updatedAt: timestamp
├── isActive: boolean
```

**Collection: users/{uid}**

```
users/{uid}
├── uid: string
├── email: string
├── displayName: string
├── photoURL: string | null
├── fcmToken: string | null
├── notificationsEnabled: boolean
├── tags: [string] (user's custom tag library)
├── createdAt: timestamp
├── updatedAt: timestamp
```

**Collection: users/{uid}/applications/{applicationId}**

```
users/{uid}/applications/{applicationId}
├── id: string
├── jobId: string | null (null if manual entry)
├── company: string
├── role: string
├── location: string
├── url: string | null
├── salary: string | null
├── tags: [string]
├── notes: string | null
├── notificationsEnabled: boolean
├── stages: [Stage] (ordered array, see below)
├── createdAt: timestamp
├── updatedAt: timestamp

Stage (embedded object):
├── id: string (UUID)
├── type: string (stage template identifier, e.g., "applied", "oa", "tech_round_1")
├── name: string (display name, can be customized)
├── status: string ("pending" | "current" | "completed" | "skipped")
├── deadline: timestamp | null
├── completedAt: timestamp | null
├── notes: string | null
├── order: int (for sorting)
```

### 8.2 Swift Data Models

```swift
// Models/Job.swift
import Foundation

struct Job: Identifiable, Codable {
    let id: String
    let company: String
    let role: String
    let location: String
    let url: String
    let season: Season
    let datePosted: Date?
    let deadline: Date?
    let sponsorship: Sponsorship?
    let source: String
    let createdAt: Date
    let updatedAt: Date
    let isActive: Bool
    
    enum Season: String, Codable, CaseIterable {
        case summer2026, fall2025, winter2026, spring2026, offseason
    }
    
    enum Sponsorship: String, Codable {
        case yes = "Yes"
        case no = "No"
        case unknown = "Unknown"
    }
}
```

```swift
// Models/Application.swift
import Foundation

struct Application: Identifiable, Codable {
    let id: String
    var jobId: String?
    var company: String
    var role: String
    var location: String
    var url: String?
    var salary: String?
    var tags: [String]
    var notes: String?
    var notificationsEnabled: Bool
    var stages: [Stage]
    let createdAt: Date
    var updatedAt: Date
    
    var currentStage: Stage? {
        stages.first { $0.status == .current }
    }
    
    var isStale: Bool {
        let twoWeeksAgo = Calendar.current.date(byAdding: .day, value: -14, to: Date())!
        return updatedAt < twoWeeksAgo
    }
}
```

```swift
// Models/Stage.swift
import Foundation

struct Stage: Identifiable, Codable {
    let id: String
    var type: StageType
    var name: String
    var status: StageStatus
    var deadline: Date?
    var completedAt: Date?
    var notes: String?
    var order: Int
    
    enum StageStatus: String, Codable {
        case pending, current, completed, skipped
    }
}
```

```swift
// Models/StageType.swift
enum StageType: String, Codable, CaseIterable, Identifiable {
    // Pre-Application
    case saved
    case preparingMaterials = "preparing_materials"
    case waitingForReferral = "waiting_for_referral"
    
    // Screening
    case applied
    case oa
    case aiCodingScreen = "ai_coding_screen"
    case aiChatScreen = "ai_chat_screen"
    case recruiterCall = "recruiter_call"
    case phoneScreen = "phone_screen"
    
    // Technical
    case techRound1 = "tech_round_1"
    case techRound2 = "tech_round_2"
    case techRound3 = "tech_round_3"
    case systemDesign = "system_design"
    case takeHomeProject = "take_home_project"
    
    // Behavioral
    case behavioralRound = "behavioral_round"
    case hiringManager = "hiring_manager"
    
    // Final
    case teamMatching = "team_matching"
    case finalRound = "final_round"
    case referenceCheck = "reference_check"
    case backgroundCheck = "background_check"
    
    // Outcome
    case offerReceived = "offer_received"
    case offerAccepted = "offer_accepted"
    case offerDeclined = "offer_declined"
    case rejected
    case withdrawn
    case ghosted
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .saved: return "Saved"
        case .preparingMaterials: return "Preparing Materials"
        case .waitingForReferral: return "Waiting for Referral"
        case .applied: return "Applied"
        case .oa: return "OA (Online Assessment)"
        case .aiCodingScreen: return "AI Coding Screen"
        case .aiChatScreen: return "AI Chat Screen"
        case .recruiterCall: return "Recruiter Call"
        case .phoneScreen: return "Phone Screen"
        case .techRound1: return "Technical Round 1"
        case .techRound2: return "Technical Round 2"
        case .techRound3: return "Technical Round 3"
        case .systemDesign: return "System Design"
        case .takeHomeProject: return "Take-Home Project"
        case .behavioralRound: return "Behavioral Round"
        case .hiringManager: return "Hiring Manager"
        case .teamMatching: return "Team Matching"
        case .finalRound: return "Final Round"
        case .referenceCheck: return "Reference Check"
        case .backgroundCheck: return "Background Check"
        case .offerReceived: return "Offer Received"
        case .offerAccepted: return "Offer Accepted"
        case .offerDeclined: return "Offer Declined"
        case .rejected: return "Rejected"
        case .withdrawn: return "Withdrawn"
        case .ghosted: return "Ghosted"
        }
    }
    
    var category: StageCategory {
        switch self {
        case .saved, .preparingMaterials, .waitingForReferral:
            return .preApplication
        case .applied, .oa, .aiCodingScreen, .aiChatScreen, .recruiterCall, .phoneScreen:
            return .screening
        case .techRound1, .techRound2, .techRound3, .systemDesign, .takeHomeProject:
            return .technical
        case .behavioralRound, .hiringManager:
            return .behavioral
        case .teamMatching, .finalRound, .referenceCheck, .backgroundCheck:
            return .final
        case .offerReceived, .offerAccepted, .offerDeclined, .rejected, .withdrawn, .ghosted:
            return .outcome
        }
    }
    
    var icon: String { // SF Symbols
        switch self {
        case .saved: return "bookmark"
        case .preparingMaterials: return "doc.text"
        case .waitingForReferral: return "person.badge.clock"
        case .applied: return "paperplane"
        case .oa: return "laptopcomputer"
        case .aiCodingScreen: return "cpu"
        case .aiChatScreen: return "video"
        case .recruiterCall: return "phone"
        case .phoneScreen: return "phone.badge.checkmark"
        case .techRound1, .techRound2, .techRound3: return "chevron.left.forwardslash.chevron.right"
        case .systemDesign: return "square.3.layers.3d"
        case .takeHomeProject: return "house"
        case .behavioralRound: return "person.2"
        case .hiringManager: return "person.badge.shield.checkmark"
        case .teamMatching: return "person.3"
        case .finalRound: return "flag.checkered"
        case .referenceCheck: return "checkmark.seal"
        case .backgroundCheck: return "shield.checkered"
        case .offerReceived: return "envelope.open"
        case .offerAccepted: return "checkmark.circle"
        case .offerDeclined: return "xmark.circle"
        case .rejected: return "xmark.octagon"
        case .withdrawn: return "arrow.uturn.backward"
        case .ghosted: return "moon.zzz"
        }
    }
}

enum StageCategory: String, CaseIterable {
    case preApplication = "Pre-Application"
    case screening = "Screening"
    case technical = "Technical"
    case behavioral = "Behavioral"
    case final = "Final"
    case outcome = "Outcome"
}
```

---

## 9. Core Components (Swift)

### 9.1 App Structure

| Component | Description |
|-----------|-------------|
| PipelinedApp.swift | App entry point. Sets up Firebase, AuthManager as environment object. |
| AuthManager | ObservableObject managing auth state. Handles Apple/Google sign-in. Publishes currentUser. |
| ContentView | Root view. Shows LoginView if unauthenticated, MainTabView if authenticated. |
| MainTabView | TabView with 4 tabs: FeedTab, PipelineTab, CalendarTab, ProfileTab. |

### 9.2 ViewModels

| ViewModel | Description |
|-----------|-------------|
| FeedViewModel | Fetches jobs from Firestore. Handles pagination, search, filters. @Published jobs, isLoading, filters. |
| PipelineViewModel | Fetches user's applications. CRUD operations. Filter by stage category. @Published applications, filters. |
| ApplicationDetailViewModel | Manages single application. Stage operations (add, remove, reorder, update). Save changes. |
| CalendarViewModel | Aggregates deadlines from all applications. Groups by date. Provides data for calendar markers. |
| ProfileViewModel | User profile data. Stats computation. Settings management. |

### 9.3 Repositories

| Repository | Description |
|------------|-------------|
| AuthRepository | Wraps Firebase Auth. signInWithApple(), signInWithGoogle(), signOut(), currentUser publisher. |
| JobRepository | Wraps Firestore jobs collection. getJobs(filters, limit, cursor), getJob(id). |
| ApplicationRepository | Wraps Firestore applications subcollection. CRUD operations. Real-time listener. |
| UserRepository | Wraps Firestore users collection. getUser(uid), updateUser(), updateFCMToken(). |
| NotificationRepository | Wraps UNUserNotificationCenter. requestPermission(), scheduleDeadlineNotifications(). |

### 9.4 Views

| View | Description |
|------|-------------|
| LoginView | Sign in with Apple button (prominent), Google sign-in button (secondary). Clean onboarding. |
| FeedView | List of JobCardViews. Search bar. Filter button opening FilterSheet. Pull-to-refresh. |
| JobCardView | Company, role, location, date. "NEW" badge. Navigation to JobDetailView. |
| JobDetailView | Full job info. External link. "Track This" button. Already tracking indicator. |
| PipelineView | List of ApplicationCardViews. Segmented control for filters. Empty state. |
| ApplicationCardView | Company, role, current stage chip, stale indicator, deadline badge. |
| ApplicationDetailView | Job info section. Stage timeline (StageListView). Notes. Tags. Delete button. |
| StageListView | Vertical timeline of stages. Add stage button at bottom. Drag to reorder. |
| StageRowView | Icon, name, status indicator, deadline. Tap to edit. Swipe to delete. |
| StageEditorSheet | Edit stage: mark complete, set deadline, add notes. |
| StagePickerSheet | Categorized grid of stage templates to add. |
| CalendarView | Monthly calendar with deadline markers. Day detail list. |
| ProfileView | User info, stats cards, notification toggle, sign out, delete account. |
| StatsView | Cards showing total, offers, rejected, response rate. |

### 9.5 Cloud Functions

| Function | Description |
|----------|-------------|
| scrapeJobs | Scheduled (every 4hr). Fetches GitHub READMEs. Parses markdown tables. Upserts to Firestore. |
| onUserCreate | Trigger: Auth user created. Creates user document with defaults. |
| onApplicationWrite | Trigger: Application write. Schedules/cancels FCM notifications based on deadlines. |
| sendNotification | Called by Cloud Tasks at scheduled times. Sends FCM to user device. |

---

## 10. Implementation Plan

**Total: 4 weeks to TestFlight. Each phase is a shippable increment.**

### Phase 1: Foundation (Days 1-5)

| Task ID | Description |
|---------|-------------|
| P1.1 | Create Xcode project with SwiftUI template. Set minimum iOS 17. |
| P1.2 | Set up Firebase project (Auth, Firestore, Functions). Add GoogleService-Info.plist. |
| P1.3 | Implement AuthManager with Sign in with Apple. |
| P1.4 | Implement Google Sign-In. |
| P1.5 | Create AuthRepository with sign-in/sign-out methods. |
| P1.6 | Set up Firestore security rules (user isolation). |
| P1.7 | Implement onUserCreate Cloud Function. |
| P1.8 | Build LoginView with Apple + Google buttons. |
| P1.9 | Build ContentView with auth state routing. |
| P1.10 | Build MainTabView skeleton (4 empty tabs). |
| P1.11 | Build basic ProfileView with user info and sign out. |

**Deliverable:** User can sign in, see empty tabs, sign out.

### Phase 2: Job Feed (Days 6-10)

| Task ID | Description |
|---------|-------------|
| P2.1 | Write scrapeJobs Cloud Function (parse speedyapply + vanshb03 repos). |
| P2.2 | Handle multiple markdown table formats in parser. |
| P2.3 | Deploy scraper on Cloud Scheduler (every 4 hours). |
| P2.4 | Implement JobRepository with pagination. |
| P2.5 | Implement FeedViewModel. |
| P2.6 | Build FeedView with LazyVStack. |
| P2.7 | Build JobCardView. |
| P2.8 | Build JobDetailView with external link. |
| P2.9 | Implement pull-to-refresh. |
| P2.10 | Implement search (local filter on fetched data). |
| P2.11 | Implement FilterSheet (location, sponsorship, season). |
| P2.12 | Add "NEW" badge for recent postings. |

**Deliverable:** User can browse, search, filter jobs and view details.

### Phase 3: Application Tracking + Stages (Days 11-17)

| Task ID | Description |
|---------|-------------|
| P3.1 | Define Stage and Application models. |
| P3.2 | Define StageType enum with all templates. |
| P3.3 | Implement ApplicationRepository with CRUD. |
| P3.4 | Implement "Track This" flow (create application with Saved stage). |
| P3.5 | Build PipelineView with application list. |
| P3.6 | Build ApplicationCardView with current stage chip. |
| P3.7 | Build ApplicationDetailView with stage timeline. |
| P3.8 | Build StageListView (vertical timeline UI). |
| P3.9 | Build StageRowView with status indicators. |
| P3.10 | Build StagePickerSheet (categorized stage library). |
| P3.11 | Implement add stage flow. |
| P3.12 | Implement stage reordering (drag and drop). |
| P3.13 | Implement stage deletion (swipe). |
| P3.14 | Build StageEditorSheet (mark complete, deadline, notes). |
| P3.15 | Implement stage status transitions. |
| P3.16 | Build manual application entry form. |
| P3.17 | Implement application deletion with confirmation. |
| P3.18 | Implement tags system (add/remove, autocomplete). |

**Deliverable:** Full application tracking with customizable stage pipelines.

### Phase 4: Calendar + Notifications (Days 18-23)

| Task ID | Description |
|---------|-------------|
| P4.1 | Implement CalendarViewModel (aggregate deadlines). |
| P4.2 | Build CalendarView with monthly view. |
| P4.3 | Build day detail sheet (list of due items). |
| P4.4 | Request notification permissions (NotificationRepository). |
| P4.5 | Implement local notification scheduling for deadlines. |
| P4.6 | Implement onApplicationWrite Cloud Function for FCM scheduling. |
| P4.7 | Set up Cloud Tasks for scheduled notification delivery. |
| P4.8 | Implement FCM token registration. |
| P4.9 | Implement deep-linking from notification to application. |
| P4.10 | Implement stale application notifications (14 days no update). |
| P4.11 | Add notification toggle per-application. |
| P4.12 | Add global notification toggle in settings. |

**Deliverable:** Calendar view, deadline notifications working end-to-end.

### Phase 5: Stats + Polish (Days 24-28)

| Task ID | Description |
|---------|-------------|
| P5.1 | Implement stats computation in ProfileViewModel. |
| P5.2 | Build StatsView with cards (total, offers, rejected, rates). |
| P5.3 | Integrate stats into ProfileView. |
| P5.4 | UI polish pass (consistent spacing, colors, typography). |
| P5.5 | Implement empty states for all views. |
| P5.6 | Add loading indicators. |
| P5.7 | Add error handling with user-friendly alerts. |
| P5.8 | Accessibility audit (VoiceOver, Dynamic Type, contrast). |
| P5.9 | Add haptic feedback for key interactions. |
| P5.10 | Performance profiling and optimization. |
| P5.11 | Implement delete account functionality. |

**Deliverable:** Complete feature set with polished UI.

### Phase 6: Launch Prep (Days 29-30)

| Task ID | Description |
|---------|-------------|
| P6.1 | Set up Firebase Crashlytics. |
| P6.2 | Set up Firebase Analytics events. |
| P6.3 | Create App Store Connect app listing. |
| P6.4 | Write App Store description and keywords. |
| P6.5 | Create screenshots (iPhone 15 Pro, iPhone SE). |
| P6.6 | Create app icon. |
| P6.7 | Write privacy policy, host on GitHub Pages. |
| P6.8 | Archive and upload to TestFlight. |
| P6.9 | Internal testing. |
| P6.10 | Invite external beta testers. |

**Deliverable:** App on TestFlight, ready for beta.

---

## 11. File Structure

```
Pipelined/
├── Pipelined.xcodeproj
├── Pipelined/
│   ├── PipelinedApp.swift              # App entry point
│   ├── ContentView.swift               # Auth routing
│   │
│   ├── Models/
│   │   ├── Job.swift
│   │   ├── Application.swift
│   │   ├── Stage.swift
│   │   ├── StageType.swift
│   │   └── User.swift
│   │
│   ├── ViewModels/
│   │   ├── AuthManager.swift
│   │   ├── FeedViewModel.swift
│   │   ├── PipelineViewModel.swift
│   │   ├── ApplicationDetailViewModel.swift
│   │   ├── CalendarViewModel.swift
│   │   └── ProfileViewModel.swift
│   │
│   ├── Repositories/
│   │   ├── AuthRepository.swift
│   │   ├── JobRepository.swift
│   │   ├── ApplicationRepository.swift
│   │   ├── UserRepository.swift
│   │   └── NotificationRepository.swift
│   │
│   ├── Views/
│   │   ├── Auth/
│   │   │   └── LoginView.swift
│   │   ├── Feed/
│   │   │   ├── FeedView.swift
│   │   │   ├── JobCardView.swift
│   │   │   ├── JobDetailView.swift
│   │   │   └── FilterSheet.swift
│   │   ├── Pipeline/
│   │   │   ├── PipelineView.swift
│   │   │   ├── ApplicationCardView.swift
│   │   │   ├── ApplicationDetailView.swift
│   │   │   ├── StageListView.swift
│   │   │   ├── StageRowView.swift
│   │   │   ├── StageEditorSheet.swift
│   │   │   ├── StagePickerSheet.swift
│   │   │   └── ManualEntryView.swift
│   │   ├── Calendar/
│   │   │   ├── CalendarView.swift
│   │   │   └── DayDetailSheet.swift
│   │   ├── Profile/
│   │   │   ├── ProfileView.swift
│   │   │   └── StatsView.swift
│   │   └── Shared/
│   │       ├── MainTabView.swift
│   │       ├── TagInputView.swift
│   │       ├── LoadingView.swift
│   │       └── EmptyStateView.swift
│   │
│   ├── Services/
│   │   └── FirebaseService.swift       # Firebase initialization
│   │
│   ├── Utilities/
│   │   ├── DateFormatter+Extensions.swift
│   │   ├── Color+Extensions.swift
│   │   └── View+Extensions.swift
│   │
│   ├── Resources/
│   │   ├── Assets.xcassets
│   │   ├── GoogleService-Info.plist
│   │   └── Localizable.strings
│   │
│   └── Preview Content/
│       └── PreviewData.swift
│
├── PipelinedTests/
│   ├── ViewModelTests/
│   ├── RepositoryTests/
│   └── ModelTests/
│
├── PipelinedUITests/
│
└── functions/                          # Firebase Cloud Functions
    ├── src/
    │   ├── index.ts
    │   ├── scrapeJobs.ts
    │   ├── onUserCreate.ts
    │   ├── onApplicationWrite.ts
    │   └── parsers/
    │       ├── speedyapplyParser.ts
    │       └── vanshb03Parser.ts
    ├── package.json
    └── tsconfig.json
```

---

## 12. Test Cases

### 12.1 Unit Tests

| ID | Area | Description |
|----|------|-------------|
| UT-1 | Models | Application.currentStage returns stage with status == current |
| UT-2 | Models | Application.isStale returns true if updatedAt > 14 days ago |
| UT-3 | Models | StageType.category returns correct category for all types |
| UT-4 | Models | StageType.displayName returns human-readable names |
| UT-5 | Parser | speedyapplyParser extracts jobs from valid markdown table |
| UT-6 | Parser | vanshb03Parser handles different column order |
| UT-7 | Parser | Parser handles missing optional columns gracefully |
| UT-8 | Parser | sourceHash is deterministic for same input |
| UT-9 | Stats | Response rate calculation is correct |
| UT-10 | Stats | Interview rate calculation is correct |

### 12.2 Integration Tests

| ID | Area | Description |
|----|------|-------------|
| IT-1 | Auth | Sign in with Apple creates user document in Firestore |
| IT-2 | Auth | Sign in with Google creates user document in Firestore |
| IT-3 | Auth | Sign out clears local state |
| IT-4 | Feed | FeedViewModel fetches and publishes jobs |
| IT-5 | Feed | Filters correctly reduce displayed jobs |
| IT-6 | Pipeline | Tracking a job creates Application with Saved stage |
| IT-7 | Pipeline | Adding a stage appends to stages array |
| IT-8 | Pipeline | Reordering stages updates order correctly |
| IT-9 | Pipeline | Deleting application removes from Firestore |
| IT-10 | Calendar | CalendarViewModel aggregates deadlines correctly |
| IT-11 | Notifications | Setting deadline schedules notification |
| IT-12 | Notifications | Removing deadline cancels notification |

### 12.3 E2E Tests

| ID | Scenario |
|----|----------|
| E2E-1 | Sign in → Browse feed → Track job → Add OA stage → Set deadline → Verify notification scheduled |
| E2E-2 | Sign in → Track job → Progress through 5 stages → Mark offer received |
| E2E-3 | Sign in → Manual entry → Add custom pipeline → Delete application |

---

## 13. Edge Cases

| ID | Scenario | Handling |
|----|----------|----------|
| EC-1 | GitHub repo down | Scraper retries with backoff. App shows cached jobs. Banner: "Feed may be stale." |
| EC-2 | Markdown format changes | Multiple parser strategies. Fallback to regex. Alert if >30% parse failure. |
| EC-3 | Job removed from source | Mark isActive=false. Hide from feed. Keep user's Application intact. |
| EC-4 | User tracks same job twice | Check jobId exists in user's applications. Show "Already tracking" on card. |
| EC-5 | Application has 20+ stages | Allow it. Vertical scroll within timeline. Warn if unusually long. |
| EC-6 | Deadline already passed | Show "Overdue" badge. Still allow adding/editing. |
| EC-7 | Notifications denied | Store preference. Show banner offering to enable in Settings. |
| EC-8 | Offline | SwiftData cache serves reads. Writes queued. Sync indicator shown. |
| EC-9 | User deletes account | Delete Firestore document and subcollections. Sign out. Clear local data. |
| EC-10 | Empty feed (no jobs) | Show friendly empty state with explanation and pull-to-refresh prompt. |
| EC-11 | App killed mid-write | Firestore SDK handles retries. SwiftData transaction safety. |
| EC-12 | Rapid stage operations | Debounce saves. Optimistic UI updates. Eventual consistency. |

---

## 14. Out of Scope (v1)

Explicitly NOT included in v1 to maintain focus:

- Android app
- iPad-optimized layouts
- Web dashboard
- Apple Watch app
- Widgets
- Custom user-created stage templates
- Interview scheduling / calendar sync (Google Calendar, Apple Calendar)
- Resume/cover letter storage and attachment
- Referral contact management
- Social features (sharing pipelines, leaderboards)
- AI-powered recommendations ("you should apply here")
- Email parsing for auto-tracking
- Company reviews or Glassdoor integration
- Salary negotiation tools
- Premium subscription features
- Internationalization (i18n) – English only
- Multiple data source configuration by user
- CSV export

---

## 15. Future Extensions (v2+)

| Feature | Description |
|---------|-------------|
| Widgets | iOS widget showing next deadline, application count, recent activity. |
| iPad support | Sidebar navigation, multi-column layouts for larger screens. |
| Watch app | Quick glance at upcoming deadlines, mark stage complete from wrist. |
| Shortcuts integration | Siri: "Add [company] to my pipeline." Automation support. |
| Calendar sync | Export deadlines to Apple/Google Calendar. |
| Email integration | Parse confirmation emails to auto-create applications. |
| Freemium | Free: 20 active applications. Premium ($5/mo): unlimited, analytics, widgets. |
| Custom stage templates | User creates and saves their own stage types. |
| Interview notes | Per-stage rich text notes with interview question tracking. |
| Analytics dashboard | Funnel visualization, time-in-stage metrics, company response patterns. |
| Browser extension | Save jobs from any career page with one click. |

**Architectural Implications for v1:**

- Stage type is a string enum – can add new types without migration.
- User ID propagated everywhere – multi-platform ready.
- Firestore schema flexible – add fields without migration.
- Notification scheduling abstracted – swap FCM for APNs if needed.

---

## 16. Dependencies

### 16.1 Swift Packages

| Package | Version | Purpose |
|---------|---------|---------|
| firebase-ios-sdk | ~11.0 | Firebase Auth, Firestore, Messaging, Crashlytics |
| GoogleSignIn-iOS | ~8.0 | Google Sign-In |
| swift-collections | ~1.1 | OrderedDictionary for stage ordering |

### 16.2 Cloud Functions Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| firebase-functions | ^5.x | Cloud Functions SDK |
| firebase-admin | ^12.x | Admin SDK |
| axios | ^1.x | HTTP client for GitHub API |
| marked | ^12.x | Markdown parsing |

### 16.3 Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Xcode | 15.4+ | IDE |
| Swift | 5.9+ | Language |
| iOS Simulator | 17+ | Testing |
| Firebase CLI | latest | Functions deployment |
| SwiftLint | 0.55+ | Code linting |
| SwiftFormat | 0.54+ | Code formatting |

---

## 17. Security & Privacy

### 17.1 Authentication

- Sign in with Apple as primary (App Store requirement).
- OAuth tokens managed by Firebase Auth SDK (secure storage).
- Keychain used for session persistence.
- No passwords stored – delegated to identity providers.

### 17.2 Authorization

- Firestore security rules enforce user isolation.
- Users can only read/write their own /users/{uid}/** paths.
- Jobs collection is read-only for clients.
- Cloud Functions use Admin SDK for system operations only.

### 17.3 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Jobs: read-only for authenticated users
    match /jobs/{jobId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // Users: only own document
    match /users/{userId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
      
      match /applications/{appId} {
        allow read, write: if request.auth != null 
                           && request.auth.uid == userId;
      }
    }
  }
}
```

### 17.4 Data Privacy

- Minimal data collection: email, name, profile photo from OAuth.
- No third-party analytics beyond Firebase (Google).
- No ad tracking.
- User can delete account and all data.
- Privacy policy clearly explains data usage.

### 17.5 App Store Compliance

- Privacy policy required (hosted on GitHub Pages).
- Sign in with Apple required (implemented).
- App Tracking Transparency not required (no IDFA usage).
- Data deletion mechanism required (delete account feature).

---

## 18. Rollout Strategy

| Phase | Description |
|-------|-------------|
| Week 1-3: Development | Build features per plan. Daily commits. PR self-review. |
| Week 4, Day 1-2: QA | Manual testing on device. Fix critical bugs. |
| Week 4, Day 3: TestFlight | Archive, upload. Internal testing. |
| Week 4, Day 4-5: Beta | Invite 10-20 beta testers (Stanford CS students, Reddit r/csMajors). |
| Week 5: Iterate | Address beta feedback. Fix bugs. Polish. |
| Week 6: App Store Submission | Prepare assets, submit for review. |
| Week 6-7: Review | Apple review (1-3 days typical). Address rejections if any. |
| Week 7+: Launch | App goes live. Monitor Crashlytics. Gather feedback. |

---

## 19. Success Metrics

### 19.1 Launch Metrics (First 4 Weeks)

| Metric | Target | Definition |
|--------|--------|------------|
| Downloads | 500+ | App Store installs |
| DAU | 100+ | Daily active users |
| D7 Retention | 40%+ | Users returning after 7 days |
| Crash-free rate | 99%+ | Crashlytics metric |
| App Store rating | 4.5+ | Average user rating |

### 19.2 Engagement Metrics

| Metric | Target | Definition |
|--------|--------|------------|
| Applications per user | 15+ | Average tracked per active user |
| Stages per application | 3+ | Average stages added |
| Deadline set rate | 50%+ | Applications with at least one deadline |
| Session duration | 2+ min | Average time in app |
| Return frequency | 3x/week | Average sessions per user per week |

### 19.3 Tracking Implementation

- Firebase Analytics events: sign_up, sign_in, view_job, track_job, add_stage, complete_stage, set_deadline.
- Custom properties: user_application_count, user_active_days.
- Crashlytics for crash reporting and ANRs.
- Cloud Functions logging for scraper health.

---

## 20. Open Questions

| ID | Question | Current Thinking |
|----|----------|------------------|
| OQ-1 | App icon design? | Need to design or commission. Pipeline/funnel motif. |
| OQ-2 | Color palette? | Lean into iOS system colors for native feel, or custom brand? |
| OQ-3 | Onboarding flow? | Skip for v1 (simple enough) or add 3-screen intro? |
| OQ-4 | Privacy policy hosting? | GitHub Pages is free and simple. |
| OQ-5 | Beta tester recruitment? | Stanford CS Discord, r/csMajors, Twitter. |
| OQ-6 | App name availability? | Verify "Pipelined" is available on App Store. |
| OQ-7 | Offseason handling? | Show offseason jobs in same feed or separate tab? |

---

**End of Document**
