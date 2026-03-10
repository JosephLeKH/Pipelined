# STYLE.md — Pipelined

> Coding standards for the full stack: TypeScript (backend) + Swift (iOS)

---

## Table of Contents

1. [Comments Philosophy](#1-comments-philosophy)
2. [TypeScript / Node.js (Backend)](#2-typescript--nodejs-backend)
3. [Swift / SwiftUI (iOS)](#3-swift--swiftui-ios)
4. [Firebase (Shared)](#4-firebase-shared)
5. [Testing](#5-testing)
6. [Git & Code Review](#6-git--code-review)

---

## 1. Comments Philosophy

**The code is the documentation.** Write code so clear it rarely needs comments.

### When NOT to Comment

```typescript
// Bad: restates the code
// increment counter
counter += 1

// Bad: obvious intent
// check if user exists
if (!user) return

// Bad: AI-style decoration
// ================================================
// ========== USER AUTHENTICATION HANDLER =========
// ================================================
```

### When to Comment

```typescript
// Good: explains WHY
// Firestore doesn't support != queries, filter client-side
const active = jobs.filter(j => j.status !== 'closed')

// Good: non-obvious business logic
// stale = 14 days, matches recruiter follow-up cadence
const isStale = daysSince(updatedAt) > 14

// Good: warns about gotchas
// force unwrap safe: token always present on success
const token = credential.identityToken!

// Good: complex algorithm (brief)
// binary search for sorted insertion point
const idx = stages.findIndex(s => s.order > newOrder)
```

### Style

- Lowercase, no period for single-line
- No ASCII art, decorative lines, em dashes
- No "This function does..." phrasing
- No JSDoc/docstrings unless public API

---

## 2. TypeScript / Node.js (Backend)

### Naming

```typescript
// files: kebab-case
scrape-jobs.ts
speedyapply-parser.ts

// types/interfaces: PascalCase
interface Job { }
type StageStatus = 'pending' | 'current' | 'completed'

// variables, functions: camelCase
const maxRetries = 3
function parseMarkdown(content: string): Job[]

// constants: camelCase (not SCREAMING_SNAKE)
const defaultTimeout = 5000

// booleans: is/has/should prefix
let isActive: boolean
let hasDeadline: boolean
```

### Formatting

```typescript
// 2 space indent, 100 char line limit
// semicolons required
// single quotes for strings

// early return, reduce nesting
async function getUser(uid: string): Promise<User | null> {
  if (!uid) return null
  
  const doc = await firestore.doc(`users/${uid}`).get()
  if (!doc.exists) return null
  
  return doc.data() as User
}

// destructure when it aids clarity
const { company, role, location } = job

// explicit return types on exported functions
export async function scrapeJobs(): Promise<void>
```

### TypeScript Specifics

```typescript
// prefer interface over type for objects
interface Job {
  id: string
  company: string
}

// use type for unions, primitives, computed
type StageType = 'applied' | 'oa' | 'rejected'
type JobId = string

// avoid any, use unknown + type guards
function parseResponse(data: unknown): Job[] {
  if (!isJobArray(data)) throw new Error('Invalid response')
  return data
}

// prefer readonly for immutable data
interface Config {
  readonly maxRetries: number
  readonly timeout: number
}

// null over undefined for explicit absence
interface Stage {
  deadline: Timestamp | null  // explicitly no deadline
}
```

### Async/Await

```typescript
// always use async/await over .then()
const jobs = await fetchJobs()

// parallel when independent
const [jobs, user] = await Promise.all([
  fetchJobs(),
  fetchUser(uid)
])

// sequential when dependent
const user = await getUser(uid)
const apps = await getApplications(user.id)

// handle errors at appropriate level
async function scrapeSource(url: string): Promise<Job[]> {
  try {
    const content = await fetch(url)
    return parseJobs(content)
  } catch (error) {
    logger.error('Scrape failed', { url, error })
    return []  // graceful degradation
  }
}
```

### Error Handling

```typescript
// custom error classes for domain errors
class ScraperError extends Error {
  constructor(
    message: string,
    public source: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'ScraperError'
  }
}

// throw early, catch late
function validateJob(job: unknown): Job {
  if (!job || typeof job !== 'object') {
    throw new ValidationError('Invalid job object')
  }
  // ...
}

// log with context
logger.error('Parse failed', {
  source: 'speedyapply',
  line: lineNumber,
  content: line.slice(0, 100)
})
```

### Project Structure

```
src/
  scrapers/
    index.ts
    speedyapply-parser.ts
    vanshb03-parser.ts
  triggers/
    on-user-create.ts
    on-application-write.ts
  types/
    job.ts
    user.ts
```

Group by feature, not by type. `index.ts` exports public API.

---

## 3. Swift / SwiftUI (iOS)

### Naming

```swift
// types: UpperCamelCase
struct Job { }
enum StageStatus { }
protocol Repository { }

// variables, functions: lowerCamelCase
let currentStage: Stage
func fetchJobs(filter: JobFilter) -> [Job]

// booleans: is/has/should
var isLoading: Bool
var hasNotifications: Bool

// acronyms as words
let apiUrl: URL       // not apiURL
let jsonData: Data    // not JSONData
```

### Formatting

```swift
// 4 space indent (Xcode default), 120 char line limit

// guard early
func process(_ input: String?) -> Result {
    guard let input, !input.isEmpty else { return .failure(.invalid) }
    return .success(transform(input))
}

// trailing closure for single closure only
jobs.filter { $0.isActive }
    .sorted { $0.createdAt > $1.createdAt }
```

### Optionals

```swift
// guard let for early exit
guard let user = currentUser else { return }

// if let for branching
if let deadline = stage.deadline {
    scheduleNotification(for: deadline)
}

// nil coalescing for defaults
let name = user.displayName ?? "Anonymous"

// avoid force unwrap, or comment why it's safe
```

### SwiftUI Views

```swift
struct JobDetailView: View {
    // 1. Environment/State at top
    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = false
    
    // 2. Properties
    let job: Job
    
    // 3. Body (keep under 30 lines)
    var body: some View {
        ScrollView {
            headerSection
            detailsSection
        }
        .task { await load() }
    }
    
    // 4. Extracted subviews
    private var headerSection: some View {
        VStack(alignment: .leading) {
            Text(job.company).font(.title)
            Text(job.role).font(.headline)
        }
    }
    
    // 5. Methods last
    private func load() async { }
}
```

### State Management

```swift
@State           // view-local value types
@Binding         // two-way to parent
@StateObject     // view owns the ObservableObject
@ObservedObject  // view observes, doesn't own
@EnvironmentObject  // injected through hierarchy
```

### MVVM Pattern

```swift
// ViewModel: @MainActor, ObservableObject
@MainActor
final class FeedViewModel: ObservableObject {
    @Published private(set) var jobs: [Job] = []
    @Published private(set) var isLoading = false
    
    private let repository: JobRepositoryProtocol
    
    func load() async {
        isLoading = true
        jobs = (try? await repository.getJobs()) ?? []
        isLoading = false
    }
}

// Repository: protocol for testability
protocol JobRepositoryProtocol {
    func getJobs() async throws -> [Job]
}
```

### Accessibility

```swift
// meaningful labels
Image(systemName: "bookmark.fill")
    .accessibilityLabel("Saved")

// hide decorative elements
Image("decorative")
    .accessibilityHidden(true)

// group related content
VStack { ... }
    .accessibilityElement(children: .combine)
```

---

## 4. Firebase (Shared)

### Firestore Reads

```typescript
// TypeScript: converters for type safety
const jobConverter = {
  toFirestore: (job: Job) => job,
  fromFirestore: (snap: QueryDocumentSnapshot): Job => snap.data() as Job
}

const jobs = await firestore
  .collection('jobs')
  .withConverter(jobConverter)
  .get()
```

```swift
// Swift: Codable
struct Job: Codable, Identifiable {
    @DocumentID var id: String?
    let company: String
}

let job = try await docRef.getDocument(as: Job.self)
```

### Firestore Writes

```typescript
// batch for atomic operations
const batch = firestore.batch()
batch.set(ref1, data1)
batch.update(ref2, { field: value })
await batch.commit()

// server timestamp
import { FieldValue } from 'firebase-admin/firestore'
{ updatedAt: FieldValue.serverTimestamp() }
```

### Security Rules

```javascript
// user isolation
allow read, write: if request.auth.uid == userId

// validate shape
allow create: if request.resource.data.keys().hasAll(['company', 'role'])

// immutable fields
allow update: if !request.resource.data.diff(resource.data)
  .affectedKeys().hasAny(['uid', 'createdAt'])
```

### Listeners

```typescript
// TypeScript: store unsubscribe
const unsubscribe = firestore
  .collection('jobs')
  .onSnapshot(snap => handleSnapshot(snap))

unsubscribe()  // cleanup
```

```swift
// Swift: store registration, use [weak self]
private var listener: ListenerRegistration?

listener = Firestore.firestore()
    .collection("jobs")
    .addSnapshotListener { [weak self] snap, _ in
        self?.handleSnapshot(snap)
    }

listener?.remove()  // cleanup
```

---

## 5. Testing

### Naming

```
test_<method>_<condition>_<expected>

test_parseJobs_validMarkdown_returnsJobs
test_loadJobs_networkError_setsError
```

### Structure

```typescript
// TypeScript (Jest)
describe('SpeedyapplyParser', () => {
  it('extracts jobs from valid markdown', () => {
    const markdown = loadFixture('valid.md')
    const jobs = parseJobs(markdown)
    
    expect(jobs).toHaveLength(5)
    expect(jobs[0].company).toBe('Google')
  })
})
```

```swift
// Swift (XCTest)
func test_parseJobs_validMarkdown_returnsJobs() {
    let markdown = loadFixture("valid.md")
    let jobs = parser.parseJobs(markdown)
    
    XCTAssertEqual(jobs.count, 5)
    XCTAssertEqual(jobs[0].company, "Google")
}
```

### Mocking

```typescript
// TypeScript
const mockRepo: JobRepository = {
  getJobs: jest.fn().mockResolvedValue([mockJob])
}
```

```swift
// Swift: protocol-based
final class MockJobRepository: JobRepositoryProtocol {
    var jobsToReturn: [Job] = []
    var error: Error?
    
    func getJobs() async throws -> [Job] {
        if let error { throw error }
        return jobsToReturn
    }
}
```

---

## 6. Git & Code Review

### Commits

```
<type>(<scope>): <subject>

feat(scraper): add vanshb03 parser
fix(auth): handle expired token refresh
test(parser): add edge case coverage
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Branches

```
feature/scraper-retry-logic
fix/notification-scheduling
```

### PR Checklist

**Backend:**
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes

**iOS:**
- [ ] Builds without warnings
- [ ] Tests pass
- [ ] SwiftLint passes
- [ ] Tested on device

**Both:**
- [ ] PR < 400 lines
- [ ] Self-reviewed

### Review

- Review within 24 hours
- Focus on logic, not style
- `nit:` for non-blocking

---

**End of STYLE.md**