# iOS Technical Design Document

> Pipelined — Swift / SwiftUI iOS App

**Version:** 1.0  
**Status:** Pending (Backend First)  
**Prerequisite:** Backend operational (see `BACKEND_SPEC.md`)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Architecture](#3-architecture)
4. [Data Models](#4-data-models)
5. [Views](#5-views)
6. [ViewModels](#6-viewmodels)
7. [Repositories](#7-repositories)
8. [Implementation Plan](#8-implementation-plan)
9. [File Structure](#9-file-structure)
10. [Testing](#10-testing)
11. [App Store Prep](#11-app-store-prep)

---

## 1. Overview

### What This Covers

- SwiftUI views and navigation
- MVVM architecture implementation
- Firebase SDK integration (client-side)
- Local caching with SwiftData
- Push notification handling
- Accessibility and polish

### What This Does NOT Cover

- Backend infrastructure (see `BACKEND_SPEC.md`)
- Cloud Functions
- Firestore security rules

### Prerequisites Before Starting

- [ ] Backend fully operational
- [ ] Jobs collection populated with real data
- [ ] Auth working (can create users)
- [ ] Notification system tested end-to-end
- [ ] Security rules deployed

---

## 2. Prerequisites

### Backend Checklist

Before writing any iOS code, verify:

```bash
# Jobs exist
firebase firestore:get jobs --limit 5

# Auth creates user docs
# Create test user in Firebase Console → verify /users/{uid} doc exists

# Notifications work
# Set deadline in Firestore Console → verify FCM arrives on test device
```

### Development Environment

| Tool | Version |
|------|---------|
| Xcode | 15.4+ |
| iOS Target | 17.0+ |
| Swift | 5.9+ |
| macOS | Sonoma 14+ |

### Firebase Setup for iOS

1. Download `GoogleService-Info.plist` from Firebase Console
2. Add to Xcode project (ensure "Copy items if needed" is checked)
3. Add Firebase SDK via Swift Package Manager

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                         Views                            │  │
│   │                                                          │  │
│   │   LoginView  FeedView  PipelineView  CalendarView       │  │
│   │   JobDetailView  ApplicationDetailView  ProfileView     │  │
│   │                                                          │  │
│   └─────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│                             │ @StateObject / @ObservedObject    │
│                             ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                      ViewModels                          │  │
│   │                                                          │  │
│   │   AuthManager  FeedViewModel  PipelineViewModel         │  │
│   │   ApplicationDetailViewModel  CalendarViewModel          │  │
│   │                                                          │  │
│   └─────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│                             │ async/await                       │
│                             ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                     Repositories                         │  │
│   │                                                          │  │
│   │   AuthRepository  JobRepository  ApplicationRepository  │  │
│   │   UserRepository  NotificationRepository                │  │
│   │                                                          │  │
│   └─────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│              ┌──────────────┴──────────────┐                   │
│              ▼                              ▼                   │
│   ┌─────────────────────┐      ┌─────────────────────┐        │
│   │    Firebase SDK     │      │     SwiftData       │        │
│   │                     │      │                     │        │
│   │  Auth, Firestore,   │      │   Local cache for   │        │
│   │  Messaging          │      │   offline support   │        │
│   └─────────────────────┘      └─────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Rules

| Layer | Can Access | Cannot Access |
|-------|------------|---------------|
| View | ViewModel | Repository, Firebase |
| ViewModel | Repository | Firebase directly |
| Repository | Firebase, SwiftData | Views |

---

## 4. Data Models

### Job

```swift
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
    
    var isNew: Bool {
        guard let posted = datePosted else { return false }
        return posted > Date().addingTimeInterval(-48 * 3600)
    }
    
    enum Season: String, Codable, CaseIterable {
        case summer2026, fall2025, winter2026, spring2026, offseason
        
        var displayName: String {
            switch self {
            case .summer2026: return "Summer 2026"
            case .fall2025: return "Fall 2025"
            case .winter2026: return "Winter 2026"
            case .spring2026: return "Spring 2026"
            case .offseason: return "Offseason"
            }
        }
    }
    
    enum Sponsorship: String, Codable {
        case yes = "Yes"
        case no = "No"
        case unknown = "Unknown"
    }
}
```

### Application

```swift
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
    
    var latestStage: Stage? {
        stages.max { $0.order < $1.order }
    }
    
    var isStale: Bool {
        updatedAt < Date().addingTimeInterval(-14 * 24 * 3600)
    }
    
    var nextDeadline: Date? {
        stages
            .compactMap { $0.deadline }
            .filter { $0 > Date() }
            .min()
    }
    
    var outcome: StageType? {
        let outcomeTypes: Set<StageType> = [
            .offerReceived, .offerAccepted, .offerDeclined,
            .rejected, .withdrawn, .ghosted
        ]
        return stages.first { outcomeTypes.contains($0.type) }?.type
    }
}
```

### Stage

```swift
struct Stage: Identifiable, Codable, Equatable {
    let id: String
    var type: StageType
    var name: String
    var status: StageStatus
    var deadline: Date?
    var completedAt: Date?
    var notes: String?
    var order: Int
    
    init(type: StageType, order: Int = 0) {
        self.id = UUID().uuidString
        self.type = type
        self.name = type.displayName
        self.status = .pending
        self.deadline = nil
        self.completedAt = nil
        self.notes = nil
        self.order = order
    }
    
    enum StageStatus: String, Codable {
        case pending, current, completed, skipped
    }
}
```

### StageType

```swift
enum StageType: String, Codable, CaseIterable, Identifiable {
    case saved
    case preparingMaterials = "preparing_materials"
    case waitingForReferral = "waiting_for_referral"
    case applied
    case oa
    case aiCodingScreen = "ai_coding_screen"
    case aiChatScreen = "ai_chat_screen"
    case recruiterCall = "recruiter_call"
    case phoneScreen = "phone_screen"
    case techRound1 = "tech_round_1"
    case techRound2 = "tech_round_2"
    case techRound3 = "tech_round_3"
    case systemDesign = "system_design"
    case takeHomeProject = "take_home_project"
    case behavioralRound = "behavioral_round"
    case hiringManager = "hiring_manager"
    case teamMatching = "team_matching"
    case finalRound = "final_round"
    case referenceCheck = "reference_check"
    case backgroundCheck = "background_check"
    case offerReceived = "offer_received"
    case offerAccepted = "offer_accepted"
    case offerDeclined = "offer_declined"
    case rejected
    case withdrawn
    case ghosted
    
    var id: String { rawValue }
    
    var displayName: String { /* ... */ }
    var category: StageCategory { /* ... */ }
    var icon: String { /* SF Symbol name */ }
    var color: Color { /* category-based color */ }
}

enum StageCategory: String, CaseIterable {
    case preApplication = "Pre-Application"
    case screening = "Screening"
    case technical = "Technical"
    case behavioral = "Behavioral"
    case final = "Final"
    case outcome = "Outcome"
    
    var color: Color {
        switch self {
        case .preApplication: return .gray
        case .screening: return .blue
        case .technical: return .purple
        case .behavioral: return .orange
        case .final: return .indigo
        case .outcome: return .green
        }
    }
    
    var stageTypes: [StageType] {
        StageType.allCases.filter { $0.category == self }
    }
}
```

### User

```swift
struct User: Identifiable, Codable {
    let uid: String
    var email: String
    var displayName: String
    var photoURL: String?
    var fcmToken: String?
    var notificationsEnabled: Bool
    var tags: [String]
    let createdAt: Date
    var updatedAt: Date
    
    var id: String { uid }
}
```

---

## 5. Views

### Navigation Structure

```
App
├── LoginView (unauthenticated)
└── MainTabView (authenticated)
    ├── Tab 1: FeedTab
    │   ├── FeedView
    │   │   ├── JobCardView (repeated)
    │   │   └── FilterSheet
    │   └── JobDetailView (navigation destination)
    │
    ├── Tab 2: PipelineTab
    │   ├── PipelineView
    │   │   └── ApplicationCardView (repeated)
    │   ├── ApplicationDetailView (navigation destination)
    │   │   ├── StageListView
    │   │   │   └── StageRowView (repeated)
    │   │   ├── StageEditorSheet
    │   │   └── StagePickerSheet
    │   └── ManualEntryView (sheet)
    │
    ├── Tab 3: CalendarTab
    │   ├── CalendarView
    │   └── DayDetailSheet
    │
    └── Tab 4: ProfileTab
        ├── ProfileView
        └── StatsView
```

### View Specifications

#### LoginView

- Sign in with Apple button (prominent, top)
- Sign in with Google button (secondary, below)
- App logo/tagline
- Clean, minimal

#### FeedView

- Search bar (sticky top)
- Filter button with active count badge
- LazyVStack of JobCardView
- Pull to refresh
- Empty state when no results

#### JobCardView

- Company name (bold)
- Role title
- Location + posted date (secondary)
- "NEW" badge if < 48 hours old
- Tap → JobDetailView

#### JobDetailView

- Company, role, location
- Posted date, deadline (if any)
- Sponsorship status
- External apply link
- "Track This" button (or "Already Tracking" badge)

#### PipelineView

- Segmented control: All / Active / Offers / Archived
- LazyVStack of ApplicationCardView
- Sort options: Updated, Deadline, Company
- "Add manually" button
- Empty state per filter

#### ApplicationCardView

- Company + role
- Current stage chip (colored by category)
- Deadline badge (if upcoming)
- "Stale" indicator (if > 14 days)
- Days since last update

#### ApplicationDetailView

- Job info section (collapsible)
- StageListView (main content)
- Notes section
- Tags section
- Delete button (with confirmation)

#### StageListView

- Vertical timeline layout
- Completed stages: checkmark, dimmed
- Current stage: highlighted, filled
- Pending stages: outlined
- "Add Stage" button at bottom
- Drag handles for reordering

#### StageRowView

- Icon (SF Symbol)
- Stage name
- Status indicator
- Deadline (if set)
- Tap → StageEditorSheet
- Swipe left → delete

#### StageEditorSheet

- Stage name (editable)
- Status picker (pending/current/completed/skipped)
- Deadline picker
- Notes field
- Save/Cancel

#### StagePickerSheet

- Grouped by category
- Grid or list of stage types
- Icon + name for each
- Tap to add

#### CalendarView

- Monthly calendar (standard iOS style)
- Dots on dates with deadlines
- Tap date → DayDetailSheet
- Navigate months

#### ProfileView

- User avatar + name
- StatsView (embedded)
- Notification toggle
- Sign out button
- Delete account button

#### StatsView

- Total applications
- In progress count
- Offers count
- Rejected count
- Response rate percentage
- Interview rate percentage

---

## 6. ViewModels

### AuthManager

```swift
@MainActor
final class AuthManager: ObservableObject {
    @Published private(set) var currentUser: FirebaseAuth.User?
    @Published private(set) var isLoading = true
    
    private let authRepository: AuthRepositoryProtocol
    private var authStateListener: AuthStateDidChangeListenerHandle?
    
    init(authRepository: AuthRepositoryProtocol = AuthRepository()) {
        self.authRepository = authRepository
        setupAuthStateListener()
    }
    
    func signInWithApple(credential: ASAuthorizationAppleIDCredential) async throws
    func signInWithGoogle(presenting: UIViewController) async throws
    func signOut() throws
    func deleteAccount() async throws
}
```

### FeedViewModel

```swift
@MainActor
final class FeedViewModel: ObservableObject {
    @Published private(set) var jobs: [Job] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    @Published var searchText = ""
    @Published var filters = JobFilters()
    
    private let jobRepository: JobRepositoryProtocol
    private var lastDocument: DocumentSnapshot?
    
    var filteredJobs: [Job] { /* search + filter logic */ }
    var hasMore: Bool { lastDocument != nil }
    
    func loadJobs() async
    func loadMore() async
    func refresh() async
}

struct JobFilters {
    var seasons: Set<Job.Season> = []
    var locations: Set<String> = []
    var sponsorship: Job.Sponsorship?
    var isActive: Bool { !seasons.isEmpty || !locations.isEmpty || sponsorship != nil }
}
```

### PipelineViewModel

```swift
@MainActor
final class PipelineViewModel: ObservableObject {
    @Published private(set) var applications: [Application] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    @Published var filter: PipelineFilter = .all
    @Published var sortOrder: SortOrder = .updated
    
    private let applicationRepository: ApplicationRepositoryProtocol
    private var listener: ListenerRegistration?
    
    var filteredApplications: [Application] { /* filter + sort logic */ }
    
    func startListening()
    func stopListening()
    func trackJob(_ job: Job) async throws
    func deleteApplication(_ id: String) async throws
}

enum PipelineFilter: String, CaseIterable {
    case all, active, offers, archived
}

enum SortOrder: String, CaseIterable {
    case updated, deadline, company
}
```

### ApplicationDetailViewModel

```swift
@MainActor
final class ApplicationDetailViewModel: ObservableObject {
    @Published var application: Application
    @Published private(set) var isSaving = false
    @Published private(set) var error: Error?
    
    private let applicationRepository: ApplicationRepositoryProtocol
    private let originalApplication: Application
    
    var hasChanges: Bool { application != originalApplication }
    
    func addStage(_ type: StageType)
    func removeStage(_ id: String)
    func moveStage(from: Int, to: Int)
    func updateStage(_ stage: Stage)
    func markStageComplete(_ id: String)
    func setCurrentStage(_ id: String)
    func save() async throws
    func revert()
}
```

### CalendarViewModel

```swift
@MainActor
final class CalendarViewModel: ObservableObject {
    @Published private(set) var deadlinesByDate: [Date: [DeadlineItem]] = [:]
    @Published var selectedDate: Date?
    
    private let applicationRepository: ApplicationRepositoryProtocol
    
    var selectedDateDeadlines: [DeadlineItem] {
        guard let date = selectedDate else { return [] }
        let key = Calendar.current.startOfDay(for: date)
        return deadlinesByDate[key] ?? []
    }
    
    func loadDeadlines() async
}

struct DeadlineItem: Identifiable {
    let id: String
    let applicationId: String
    let company: String
    let role: String
    let stageName: String
    let deadline: Date
}
```

### ProfileViewModel

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published private(set) var user: User?
    @Published private(set) var stats: ApplicationStats?
    @Published var notificationsEnabled: Bool = true
    
    private let userRepository: UserRepositoryProtocol
    private let applicationRepository: ApplicationRepositoryProtocol
    
    func loadProfile() async
    func loadStats() async
    func updateNotificationPreference(_ enabled: Bool) async throws
}

struct ApplicationStats {
    let total: Int
    let inProgress: Int
    let offers: Int
    let rejected: Int
    let responseRate: Double
    let interviewRate: Double
}
```

---

## 7. Repositories

### AuthRepository

```swift
protocol AuthRepositoryProtocol {
    var currentUser: FirebaseAuth.User? { get }
    func signInWithApple(credential: ASAuthorizationAppleIDCredential, nonce: String) async throws -> FirebaseAuth.User
    func signInWithGoogle(idToken: String, accessToken: String) async throws -> FirebaseAuth.User
    func signOut() throws
    func deleteAccount() async throws
    func addStateListener(_ listener: @escaping (FirebaseAuth.User?) -> Void) -> AuthStateDidChangeListenerHandle
}
```

### JobRepository

```swift
protocol JobRepositoryProtocol {
    func getJobs(filters: JobFilters, limit: Int, after: DocumentSnapshot?) async throws -> (jobs: [Job], lastDocument: DocumentSnapshot?)
    func getJob(id: String) async throws -> Job?
}
```

### ApplicationRepository

```swift
protocol ApplicationRepositoryProtocol {
    func getApplications(for userId: String) async throws -> [Application]
    func addListener(for userId: String, onChange: @escaping ([Application]) -> Void) -> ListenerRegistration
    func getApplication(id: String, userId: String) async throws -> Application?
    func createApplication(_ application: Application, userId: String) async throws
    func updateApplication(_ application: Application, userId: String) async throws
    func deleteApplication(id: String, userId: String) async throws
    func isJobTracked(jobId: String, userId: String) async throws -> Bool
}
```

### UserRepository

```swift
protocol UserRepositoryProtocol {
    func getUser(uid: String) async throws -> User?
    func updateUser(_ user: User) async throws
    func updateFcmToken(uid: String, token: String) async throws
    func deleteUser(uid: String) async throws
}
```

### NotificationRepository

```swift
protocol NotificationRepositoryProtocol {
    func requestPermission() async throws -> Bool
    func getToken() async throws -> String?
    func registerToken(_ token: String, for userId: String) async throws
}
```

---

## 8. Implementation Plan

### Phase I1: Project Setup (Day 1)

| Task | Description |
|------|-------------|
| I1.1 | Create Xcode project (SwiftUI, iOS 17+) |
| I1.2 | Add Firebase SDK via SPM |
| I1.3 | Add GoogleService-Info.plist |
| I1.4 | Configure Firebase in App init |
| I1.5 | Set up folder structure |
| I1.6 | Configure SwiftLint |

**Deliverable:** Empty app runs with Firebase initialized.

### Phase I2: Auth (Days 2-3)

| Task | Description |
|------|-------------|
| I2.1 | Implement AuthRepository |
| I2.2 | Implement AuthManager |
| I2.3 | Build LoginView |
| I2.4 | Implement Sign in with Apple |
| I2.5 | Implement Google Sign-In |
| I2.6 | Build ContentView with auth routing |
| I2.7 | Build MainTabView skeleton |
| I2.8 | Test auth flow end-to-end |

**Deliverable:** User can sign in and see empty tabs.

### Phase I3: Feed (Days 4-6)

| Task | Description |
|------|-------------|
| I3.1 | Define Job model |
| I3.2 | Implement JobRepository |
| I3.3 | Implement FeedViewModel |
| I3.4 | Build JobCardView |
| I3.5 | Build FeedView with LazyVStack |
| I3.6 | Implement pull-to-refresh |
| I3.7 | Implement pagination |
| I3.8 | Build JobDetailView |
| I3.9 | Implement search |
| I3.10 | Build FilterSheet |
| I3.11 | Add "NEW" badge logic |

**Deliverable:** User can browse, search, filter jobs.

### Phase I4: Pipeline Core (Days 7-10)

| Task | Description |
|------|-------------|
| I4.1 | Define Application, Stage, StageType models |
| I4.2 | Implement ApplicationRepository |
| I4.3 | Implement PipelineViewModel |
| I4.4 | Implement "Track This" flow |
| I4.5 | Build ApplicationCardView |
| I4.6 | Build PipelineView |
| I4.7 | Build ApplicationDetailView |
| I4.8 | Implement real-time listener |

**Deliverable:** User can track jobs and see them in pipeline.

### Phase I5: Stage System (Days 11-14)

| Task | Description |
|------|-------------|
| I5.1 | Implement ApplicationDetailViewModel |
| I5.2 | Build StageListView (timeline UI) |
| I5.3 | Build StageRowView |
| I5.4 | Build StagePickerSheet |
| I5.5 | Implement add stage flow |
| I5.6 | Build StageEditorSheet |
| I5.7 | Implement stage status changes |
| I5.8 | Implement deadline setting |
| I5.9 | Implement stage reordering |
| I5.10 | Implement stage deletion |
| I5.11 | Build ManualEntryView |
| I5.12 | Implement tags system |

**Deliverable:** Full stage management working.

### Phase I6: Calendar (Days 15-16)

| Task | Description |
|------|-------------|
| I6.1 | Implement CalendarViewModel |
| I6.2 | Build CalendarView |
| I6.3 | Build DayDetailSheet |
| I6.4 | Wire up deadline aggregation |

**Deliverable:** Calendar shows all deadlines.

### Phase I7: Notifications (Days 17-18)

| Task | Description |
|------|-------------|
| I7.1 | Implement NotificationRepository |
| I7.2 | Request notification permission |
| I7.3 | Register FCM token with backend |
| I7.4 | Handle incoming notifications |
| I7.5 | Implement deep linking |
| I7.6 | Add notification toggles in UI |

**Deliverable:** Push notifications work end-to-end.

### Phase I8: Profile & Stats (Days 19-20)

| Task | Description |
|------|-------------|
| I8.1 | Implement ProfileViewModel |
| I8.2 | Build ProfileView |
| I8.3 | Build StatsView |
| I8.4 | Implement stats computation |
| I8.5 | Implement sign out |
| I8.6 | Implement delete account |

**Deliverable:** Profile complete with stats.

### Phase I9: Polish (Days 21-24)

| Task | Description |
|------|-------------|
| I9.1 | Empty states for all views |
| I9.2 | Loading indicators |
| I9.3 | Error handling UI |
| I9.4 | Accessibility audit |
| I9.5 | Dynamic Type support |
| I9.6 | VoiceOver labels |
| I9.7 | Haptic feedback |
| I9.8 | Animation polish |
| I9.9 | Performance profiling |

**Deliverable:** Production-quality UI.

### Phase I10: Launch (Days 25-28)

| Task | Description |
|------|-------------|
| I10.1 | App icon design |
| I10.2 | Launch screen |
| I10.3 | App Store screenshots |
| I10.4 | App Store description |
| I10.5 | Privacy policy |
| I10.6 | TestFlight build |
| I10.7 | Beta testing |
| I10.8 | Bug fixes |
| I10.9 | App Store submission |

**Deliverable:** App on App Store.

---

## 9. File Structure

```
ios/
├── Pipelined.xcodeproj
├── Pipelined/
│   ├── PipelinedApp.swift
│   ├── ContentView.swift
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
│   │   └── FirebaseService.swift
│   │
│   ├── Utilities/
│   │   ├── Date+Extensions.swift
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
└── PipelinedUITests/
```

---

## 10. Testing

### Unit Tests

| ID | Area | Description |
|----|------|-------------|
| UT-I1 | Models | Application.currentStage returns correct stage |
| UT-I2 | Models | Application.isStale returns true after 14 days |
| UT-I3 | Models | Job.isNew returns true for recent posts |
| UT-I4 | Models | StageType.category returns correct category |
| UT-I5 | ViewModel | FeedViewModel filters jobs correctly |
| UT-I6 | ViewModel | PipelineViewModel sorts correctly |
| UT-I7 | ViewModel | ApplicationDetailViewModel tracks changes |
| UT-I8 | ViewModel | CalendarViewModel groups deadlines by date |

### Integration Tests

| ID | Area | Description |
|----|------|-------------|
| IT-I1 | Auth | Sign in creates session |
| IT-I2 | Auth | Sign out clears session |
| IT-I3 | Feed | Jobs load from Firestore |
| IT-I4 | Pipeline | Application syncs to Firestore |
| IT-I5 | Pipeline | Real-time updates work |

### UI Tests

| ID | Description |
|----|-------------|
| UI-I1 | Complete sign-in flow |
| UI-I2 | Browse feed and open job detail |
| UI-I3 | Track job and see in pipeline |
| UI-I4 | Add stages to application |
| UI-I5 | Set deadline and see on calendar |

---

## 11. App Store Prep

### Required Assets

| Asset | Spec |
|-------|------|
| App Icon | 1024x1024 PNG |
| Screenshots | iPhone 15 Pro (6.7"), iPhone SE (4.7") |
| App Preview | Optional video, 15-30 seconds |

### App Store Metadata

```
Name: Pipelined
Subtitle: Track Your Internship Hunt
Category: Productivity
Keywords: internship, jobs, tracker, application, pipeline, career, interview
```

### Privacy Policy Requirements

Must disclose:
- Data collected (email, name, application data)
- How data is used (app functionality)
- Third parties (Firebase/Google)
- Data deletion (account deletion feature)

### Review Guidelines Checklist

- [ ] Sign in with Apple implemented
- [ ] Privacy policy linked
- [ ] No placeholder content
- [ ] All features functional
- [ ] Crashes fixed
- [ ] Delete account available

---

**End of iOS Spec**
