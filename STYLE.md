# STYLE.md — Pipelined

> Swift / SwiftUI / Firebase coding standards and best practices.

---

## Table of Contents

0. [Comments Philosophy](#0-comments-philosophy)
1. [Swift Style](#1-swift-style)
2. [SwiftUI Patterns](#2-swiftui-patterns)
3. [Architecture (MVVM)](#3-architecture-mvvm)
4. [Firebase Integration](#4-firebase-integration)
5. [Error Handling](#5-error-handling)
6. [Concurrency (async/await)](#6-concurrency-asyncawait)
7. [Testing](#7-testing)
8. [Performance](#8-performance)
9. [Accessibility](#9-accessibility)
10. [Git & Code Review](#10-git--code-review)

---

## 0. Comments Philosophy

**The code is the documentation.** Write code so clear it rarely needs comments.

### When NOT to Comment

```swift
// Bad: comment restates the code
// Increment the counter
counter += 1

// Bad: comment explains obvious intent
// Check if user is logged in
guard let user = currentUser else { return }

// Bad: AI-style over-documentation
// ============================================
// MARK: - User Authentication Handler
// ============================================
// This function handles the user authentication
// by checking the credentials and returning...
```

### When to Comment

```swift
// Good: explains WHY, not what
// Firestore doesn't support != queries, so we fetch all and filter client-side
let filtered = jobs.filter { $0.status != .closed }

// Good: documents non-obvious business logic
// Stale = no update in 14 days. Matches recruiter follow-up best practice.
var isStale: Bool { updatedAt < Date().addingDays(-14) }

// Good: warns about gotchas
// Force unwrap safe: identityToken is always present when credential succeeds
let token = String(data: credential.identityToken!, encoding: .utf8)!

// Good: explains complex algorithm (briefly)
// Binary search for insertion point to maintain sorted order
let index = stages.partitioningIndex { $0.order > newStage.order }
```

### Comment Style

```swift
// Use lowercase, no period for single-line
// explains the weird edge case

// Multi-line only when necessary. Keep it tight.
// OAuth tokens expire after 1 hour. We refresh proactively at 50 min
// to avoid mid-request expiration during slow networks.

// Never use:
// - ASCII art or decorative lines
// - Em dashes (—) or fancy punctuation  
// - "This function does..." phrasing
// - Parameter/return docs unless it's a public API
```

### MARK Sparingly

```swift
// Use MARK only in files > 200 lines to aid navigation
// Keep it minimal

// MARK: - Actions

// Not this:
// MARK: - ==================== Actions ====================
// MARK: - Button Action Handlers
// MARK: -
```

---

## 1. Swift Style

### Naming

```swift
// Types: UpperCamelCase
struct JobApplication { }
enum StageStatus { }
protocol DataRepository { }

// Variables, functions, parameters: lowerCamelCase
let currentStage: Stage
func fetchJobs(withFilter filter: JobFilter) -> [Job]

// Constants: lowerCamelCase (not SCREAMING_SNAKE)
let maxRetryCount = 3

// Booleans: use is/has/should prefix
var isLoading: Bool
var hasNotifications: Bool
var shouldRefresh: Bool

// Acronyms: treat as words
let apiUrl: URL      // not apiURL
let jsonData: Data   // not JSONData
let userId: String   // not userID (except when matching external APIs)
```

### Formatting

```swift
// Line length: 120 characters max
// Indentation: 4 spaces (Xcode default)

// Braces: same line
if condition {
    doSomething()
} else {
    doSomethingElse()
}

// Guard early, reduce nesting
func process(_ input: String?) -> Result {
    guard let input = input, !input.isEmpty else {
        return .failure(.invalidInput)
    }
    // Main logic at top level
    return .success(transform(input))
}

// Trailing closures: use for single closure, avoid for multiple
// Good
jobs.filter { $0.isActive }
    .sorted { $0.createdAt > $1.createdAt }

// Avoid
UIView.animate(withDuration: 0.3) {
    // ...
} completion: { _ in  // Confusing
    // ...
}

// Prefer
UIView.animate(withDuration: 0.3, animations: {
    // ...
}, completion: { _ in
    // ...
})
```

### Type Inference

```swift
// Let compiler infer when obvious
let jobs = [Job]()           // Not: let jobs: [Job] = [Job]()
let isActive = true          // Not: let isActive: Bool = true

// Be explicit when it aids readability
let timeout: TimeInterval = 30  // Clearer than just 30
let statusCode: Int = response.code  // When type isn't obvious
```

### Access Control

```swift
// Default to most restrictive, then open up as needed
// File structure order: public → internal → private

public struct Job { }           // API surface
internal class JobRepository { } // Module-internal (can omit `internal`)
private var cache: [Job] = []   // Implementation detail
fileprivate func helper() { }   // Shared within file only

// Prefer private over fileprivate
// Use fileprivate only when multiple types in same file need access
```

### Optionals

```swift
// Prefer guard let for early exit
guard let user = currentUser else { return }

// Use if let for branching logic
if let deadline = stage.deadline {
    scheduleNotification(for: deadline)
}

// Nil coalescing for defaults
let name = user.displayName ?? "Anonymous"

// Avoid force unwrap (!) except in tests or truly impossible nil cases
// If you must, add a comment explaining why it's safe
let cell = tableView.dequeueReusableCell(withIdentifier: "Cell")!  // Bad
let cell = tableView.dequeueReusableCell(withIdentifier: "Cell") 
    ?? UITableViewCell()  // Better

// Optional chaining
user?.profile?.avatar?.url
```

---

## 2. SwiftUI Patterns

### View Structure

```swift
struct JobDetailView: View {
    // 1. Environment & State (top)
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var authManager: AuthManager
    
    // 2. State properties
    @State private var isLoading = false
    @State private var showAlert = false
    
    // 3. Bindings
    @Binding var selectedJob: Job?
    
    // 4. Regular properties
    let job: Job
    
    // 5. Computed properties
    private var isTracked: Bool {
        // ...
    }
    
    // 6. Body (keep under 30 lines, extract subviews)
    var body: some View {
        ScrollView {
            headerSection
            detailsSection
            actionButtons
        }
        .navigationTitle(job.company)
        .task { await loadData() }
    }
    
    // 7. Subviews as computed properties
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(job.company).font(.title)
            Text(job.role).font(.headline)
        }
    }
    
    // 8. Methods last
    private func loadData() async { }
}
```

### State Management

```swift
// @State: View-local, value types
@State private var searchText = ""

// @Binding: Two-way connection to parent's state
@Binding var isPresented: Bool

// @StateObject: View owns the ObservableObject (create once)
@StateObject private var viewModel = FeedViewModel()

// @ObservedObject: View observes but doesn't own (passed in)
@ObservedObject var viewModel: FeedViewModel

// @EnvironmentObject: Dependency injection through view hierarchy
@EnvironmentObject var authManager: AuthManager

// @Environment: System-provided values
@Environment(\.colorScheme) var colorScheme
@Environment(\.dismiss) var dismiss
```

### View Extraction Rules

```swift
// Extract when:
// - Body exceeds 30 lines
// - Logic is reused
// - Component is independently testable

// Keep inline when:
// - Simple, one-off layout
// - Extraction would just move code without benefit

// Prefer computed properties for same-file extractions
private var stageList: some View { ... }

// Prefer separate struct for reusable components
struct StageRowView: View { ... }
```

### Modifiers Order

```swift
// Consistent modifier ordering aids readability
Text("Hello")
    // 1. Content modifiers
    .font(.headline)
    .foregroundColor(.primary)
    // 2. Layout modifiers
    .padding()
    .frame(maxWidth: .infinity)
    // 3. Background/overlay
    .background(Color.gray.opacity(0.1))
    .cornerRadius(8)
    // 4. Gestures & interactions
    .onTapGesture { }
    // 5. Lifecycle
    .onAppear { }
    .task { }
```

### Navigation

```swift
// Use NavigationStack (iOS 16+)
NavigationStack {
    List(jobs) { job in
        NavigationLink(value: job) {
            JobCardView(job: job)
        }
    }
    .navigationDestination(for: Job.self) { job in
        JobDetailView(job: job)
    }
}

// Sheets: use item binding for data-driven presentation
.sheet(item: $selectedJob) { job in
    JobDetailSheet(job: job)
}

// Alerts: use isPresented for simple, item for data-driven
.alert("Error", isPresented: $showError) {
    Button("OK") { }
}
```

---

## 3. Architecture (MVVM)

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────┐
│                      View                           │
│  - Renders UI based on ViewModel state              │
│  - Sends user actions to ViewModel                  │
│  - No business logic                                │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                   ViewModel                         │
│  - @Published state properties                      │
│  - Business logic & validation                      │
│  - Calls Repository methods                         │
│  - Transforms data for View                         │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  Repository                         │
│  - Data access abstraction                          │
│  - Firestore, local cache, network                  │
│  - Returns domain models                            │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                    Model                            │
│  - Plain data structures                            │
│  - Codable for serialization                        │
│  - No business logic (or minimal computed props)    │
└─────────────────────────────────────────────────────┘
```

### ViewModel Pattern

```swift
@MainActor
final class FeedViewModel: ObservableObject {
    // MARK: - Published State
    @Published private(set) var jobs: [Job] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: Error?
    @Published var searchText = ""
    @Published var filters = JobFilters()
    
    // MARK: - Dependencies
    private let jobRepository: JobRepositoryProtocol
    
    // MARK: - Init
    init(jobRepository: JobRepositoryProtocol = JobRepository()) {
        self.jobRepository = jobRepository
    }
    
    // MARK: - Public Methods
    func loadJobs() async {
        isLoading = true
        error = nil
        
        do {
            jobs = try await jobRepository.getJobs(filters: filters)
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
    
    func refresh() async {
        await loadJobs()
    }
    
    // MARK: - Computed Properties
    var filteredJobs: [Job] {
        guard !searchText.isEmpty else { return jobs }
        return jobs.filter { 
            $0.company.localizedCaseInsensitiveContains(searchText) ||
            $0.role.localizedCaseInsensitiveContains(searchText)
        }
    }
}
```

### Repository Pattern

```swift
// Protocol for testability
protocol JobRepositoryProtocol {
    func getJobs(filters: JobFilters) async throws -> [Job]
    func getJob(id: String) async throws -> Job?
}

// Concrete implementation
final class JobRepository: JobRepositoryProtocol {
    private let firestore = Firestore.firestore()
    private let cache: JobCache
    
    func getJobs(filters: JobFilters) async throws -> [Job] {
        // Try cache first
        if let cached = cache.get(for: filters), !cached.isStale {
            return cached.jobs
        }
        
        // Fetch from Firestore
        var query: Query = firestore.collection("jobs")
            .whereField("isActive", isEqualTo: true)
        
        if let season = filters.season {
            query = query.whereField("season", isEqualTo: season.rawValue)
        }
        
        let snapshot = try await query.getDocuments()
        let jobs = snapshot.documents.compactMap { try? $0.data(as: Job.self) }
        
        // Update cache
        cache.set(jobs, for: filters)
        
        return jobs
    }
}
```

---

## 4. Firebase Integration

### Firestore

```swift
// Use Codable models
struct Job: Codable, Identifiable {
    @DocumentID var id: String?
    let company: String
    let role: String
    // ...
}

// Fetch with type safety
func getJob(id: String) async throws -> Job? {
    try await firestore
        .collection("jobs")
        .document(id)
        .getDocument(as: Job.self)
}

// Real-time listeners: store the listener handle
private var listener: ListenerRegistration?

func startListening() {
    listener = firestore
        .collection("users/\(uid)/applications")
        .addSnapshotListener { [weak self] snapshot, error in
            guard let documents = snapshot?.documents else { return }
            self?.applications = documents.compactMap { 
                try? $0.data(as: Application.self) 
            }
        }
}

func stopListening() {
    listener?.remove()
    listener = nil
}

// Batch writes for atomic operations
func updateStages(_ stages: [Stage], for applicationId: String) async throws {
    let batch = firestore.batch()
    let ref = firestore.document("users/\(uid)/applications/\(applicationId)")
    batch.updateData(["stages": stages.map { try! Firestore.Encoder().encode($0) }], forDocument: ref)
    batch.updateData(["updatedAt": FieldValue.serverTimestamp()], forDocument: ref)
    try await batch.commit()
}
```

### Firebase Auth

```swift
// Sign in with Apple
func signInWithApple(credential: ASAuthorizationAppleIDCredential) async throws -> User {
    let oauthCredential = OAuthProvider.credential(
        providerID: AuthProviderID.apple,
        idToken: String(data: credential.identityToken!, encoding: .utf8)!,
        rawNonce: nonce
    )
    let result = try await Auth.auth().signIn(with: oauthCredential)
    return result.user
}

// Listen to auth state
Auth.auth().addStateDidChangeListener { [weak self] _, user in
    self?.currentUser = user
}

// Always check auth state before Firestore operations
guard let uid = Auth.auth().currentUser?.uid else {
    throw AuthError.notAuthenticated
}
```

### Security Rules Patterns

```javascript
// Match user documents
match /users/{userId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Validate data shape
match /users/{userId}/applications/{appId} {
    allow create: if request.auth.uid == userId
        && request.resource.data.company is string
        && request.resource.data.role is string;
    
    allow update: if request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['stages', 'notes', 'tags', 'updatedAt']);
}
```

---

## 5. Error Handling

### Error Types

```swift
// Domain-specific errors
enum ApplicationError: LocalizedError {
    case notFound
    case alreadyTracking
    case invalidStage
    case networkUnavailable
    
    var errorDescription: String? {
        switch self {
        case .notFound: return "Application not found"
        case .alreadyTracking: return "You're already tracking this job"
        case .invalidStage: return "Invalid stage transition"
        case .networkUnavailable: return "No internet connection"
        }
    }
}

// Map external errors to domain errors
func mapFirestoreError(_ error: Error) -> ApplicationError {
    let nsError = error as NSError
    switch nsError.code {
    case FirestoreErrorCode.notFound.rawValue:
        return .notFound
    case FirestoreErrorCode.unavailable.rawValue:
        return .networkUnavailable
    default:
        return .unknown(error)
    }
}
```

### Error Propagation

```swift
// Repository: throw errors
func getApplication(id: String) async throws -> Application {
    guard let app = try await fetchFromFirestore(id: id) else {
        throw ApplicationError.notFound
    }
    return app
}

// ViewModel: catch and expose
func load() async {
    do {
        application = try await repository.getApplication(id: id)
    } catch {
        self.error = error
    }
}

// View: display appropriately
if let error = viewModel.error {
    ErrorView(error: error, retryAction: viewModel.load)
}
```

### Result Type (when appropriate)

```swift
// Use Result for operations where both success and failure are expected
func validateStageTransition(from: Stage, to: Stage) -> Result<Void, StageError> {
    guard canTransition(from: from, to: to) else {
        return .failure(.invalidTransition)
    }
    return .success(())
}
```

---

## 6. Concurrency (async/await)

### Task Management

```swift
// In Views: use .task modifier
.task {
    await viewModel.load()
}

// Task cancellation on view disappear is automatic with .task

// For manual task management
@State private var loadTask: Task<Void, Never>?

func startLoading() {
    loadTask?.cancel()
    loadTask = Task {
        await viewModel.load()
    }
}

// Check for cancellation in long operations
func processItems(_ items: [Item]) async throws {
    for item in items {
        try Task.checkCancellation()
        await process(item)
    }
}
```

### Main Actor

```swift
// ViewModels should be @MainActor
@MainActor
final class FeedViewModel: ObservableObject { }

// Or mark specific methods
func updateUI() async {
    await MainActor.run {
        self.isLoading = false
    }
}

// Prefer nonisolated for pure computation
nonisolated func computeStats(from applications: [Application]) -> Stats {
    // Pure computation, no UI updates
}
```

### Structured Concurrency

```swift
// Parallel independent operations
async let jobs = jobRepository.getJobs()
async let user = userRepository.getUser()
let (fetchedJobs, fetchedUser) = await (try jobs, try user)

// Task groups for dynamic parallelism
func fetchAllPages() async throws -> [Job] {
    try await withThrowingTaskGroup(of: [Job].self) { group in
        for page in 0..<totalPages {
            group.addTask {
                try await self.fetchPage(page)
            }
        }
        return try await group.reduce(into: []) { $0 += $1 }
    }
}
```

---

## 7. Testing

### Unit Test Structure

```swift
final class FeedViewModelTests: XCTestCase {
    var sut: FeedViewModel!
    var mockRepository: MockJobRepository!
    
    override func setUp() {
        super.setUp()
        mockRepository = MockJobRepository()
        sut = FeedViewModel(jobRepository: mockRepository)
    }
    
    override func tearDown() {
        sut = nil
        mockRepository = nil
        super.tearDown()
    }
    
    // Test naming: test_methodName_condition_expectedResult
    func test_loadJobs_success_updatesJobsList() async {
        // Given
        let expectedJobs = [Job.mock(), Job.mock()]
        mockRepository.jobsToReturn = expectedJobs
        
        // When
        await sut.loadJobs()
        
        // Then
        XCTAssertEqual(sut.jobs.count, 2)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.error)
    }
    
    func test_loadJobs_failure_setsError() async {
        // Given
        mockRepository.errorToThrow = ApplicationError.networkUnavailable
        
        // When
        await sut.loadJobs()
        
        // Then
        XCTAssertTrue(sut.jobs.isEmpty)
        XCTAssertNotNil(sut.error)
    }
}
```

### Mocks

```swift
// Protocol-based mocking
final class MockJobRepository: JobRepositoryProtocol {
    var jobsToReturn: [Job] = []
    var errorToThrow: Error?
    var getJobsCalled = false
    
    func getJobs(filters: JobFilters) async throws -> [Job] {
        getJobsCalled = true
        if let error = errorToThrow { throw error }
        return jobsToReturn
    }
}

// Test data factories
extension Job {
    static func mock(
        id: String = UUID().uuidString,
        company: String = "Test Company",
        role: String = "Software Engineer"
    ) -> Job {
        Job(id: id, company: company, role: role, ...)
    }
}
```

### UI Testing

```swift
final class FeedUITests: XCTestCase {
    let app = XCUIApplication()
    
    override func setUp() {
        continueAfterFailure = false
        app.launchArguments = ["--uitesting"]
        app.launch()
    }
    
    func test_feed_showsJobs() {
        // Given user is logged in (handled by launch argument)
        
        // Then
        XCTAssertTrue(app.navigationBars["Jobs"].exists)
        XCTAssertTrue(app.cells.count > 0)
    }
    
    func test_tapJob_showsDetail() {
        // When
        app.cells.firstMatch.tap()
        
        // Then
        XCTAssertTrue(app.buttons["Track This"].exists)
    }
}
```

---

## 8. Performance

### SwiftUI Performance

```swift
// Use Identifiable + id for List performance
List(jobs) { job in  // Jobs: Identifiable
    JobCardView(job: job)
}

// Avoid re-creating objects in body
// Bad
var body: some View {
    let formatter = DateFormatter()  // Created every render
}

// Good
private static let dateFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateStyle = .medium
    return f
}()

// Use @ViewBuilder for conditional views
@ViewBuilder
private var content: some View {
    if isLoading {
        ProgressView()
    } else {
        jobList
    }
}

// Lazy loading for large lists
LazyVStack {
    ForEach(jobs) { job in
        JobCardView(job: job)
    }
}
```

### Firestore Performance

```swift
// Limit query results
query.limit(to: 50)

// Use pagination
func loadMore(after lastDocument: DocumentSnapshot) async throws {
    let snapshot = try await query
        .start(afterDocument: lastDocument)
        .limit(to: 50)
        .getDocuments()
}

// Select only needed fields (when available)
// Prefer smaller documents over frequent partial reads

// Cache aggressively
let settings = FirestoreSettings()
settings.cacheSettings = PersistentCacheSettings(sizeBytes: 100_000_000)  // 100MB
```

### Memory Management

```swift
// Use [weak self] in closures that capture self
listener = query.addSnapshotListener { [weak self] snapshot, error in
    guard let self else { return }
    self.handleSnapshot(snapshot)
}

// Cancel tasks and listeners on deinit
deinit {
    listener?.remove()
    loadTask?.cancel()
}
```

---

## 9. Accessibility

### Basics

```swift
// Meaningful labels
Image(systemName: "bookmark.fill")
    .accessibilityLabel("Saved")

// Hide decorative elements
Image("decorative-line")
    .accessibilityHidden(true)

// Group related elements
VStack {
    Text(job.company)
    Text(job.role)
}
.accessibilityElement(children: .combine)

// Custom actions
.accessibilityAction(named: "Track Job") {
    trackJob()
}
```

### Dynamic Type

```swift
// Use system text styles
Text(job.company)
    .font(.headline)  // Scales with Dynamic Type

// Test with large text sizes
// Avoid fixed heights that truncate text

// Allow multi-line when needed
Text(job.role)
    .lineLimit(nil)
    .fixedSize(horizontal: false, vertical: true)
```

### VoiceOver

```swift
// Provide context
Button("Track") { }
    .accessibilityLabel("Track \(job.company) \(job.role)")
    .accessibilityHint("Adds this job to your pipeline")

// Announce changes
.onChange(of: isTracked) { newValue in
    UIAccessibility.post(
        notification: .announcement,
        argument: newValue ? "Job tracked" : "Job removed"
    )
}

// Traits
.accessibilityAddTraits(.isButton)
.accessibilityRemoveTraits(.isImage)
```

---

## 10. Git & Code Review

### Commit Messages

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Examples:**
```
feat(stages): add AI coding screen stage type

fix(feed): correct pagination cursor handling

refactor(viewmodel): extract stats computation to separate method

test(application): add unit tests for stage transitions
```

### Branch Naming

```
feature/stages-drag-drop
fix/notification-deep-link
refactor/repository-pattern
```

### Pull Request Checklist

- [ ] Code compiles without warnings
- [ ] All tests pass
- [ ] New code has tests
- [ ] Accessibility labels added for new UI
- [ ] No force unwraps without justification
- [ ] ViewModel logic covered by unit tests
- [ ] SwiftLint passes
- [ ] Tested on device (not just simulator)

### Code Review Guidelines

**Author:**
- Keep PRs small (<400 lines)
- Self-review before requesting
- Explain non-obvious decisions in comments

**Reviewer:**
- Review within 24 hours
- Focus on logic, not style (let SwiftLint handle style)
- Approve when "good enough" — don't block on perfection
- Use "nit:" prefix for non-blocking suggestions

---

## Quick Reference

### Common Patterns

```swift
// Optional binding
guard let value = optional else { return }

// Async loading
@State private var isLoading = false
.task { await load() }

// Error presentation
.alert("Error", isPresented: $showError, presenting: error) { _ in
    Button("OK") { }
} message: { error in
    Text(error.localizedDescription)
}

// Environment dismiss
@Environment(\.dismiss) private var dismiss
Button("Done") { dismiss() }
```

---

**End of STYLE.md**