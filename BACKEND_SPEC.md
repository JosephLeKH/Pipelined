# Backend Technical Design Document

> Pipelined — Node.js / Firebase Backend

**Version:** 1.0  
**Status:** Active Development  
**Target:** Fully operational backend before iOS work begins

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Cloud Functions](#4-cloud-functions)
5. [Firestore Schema & Rules](#5-firestore-schema--rules)
6. [Job Scraper](#6-job-scraper)
7. [Notification System](#7-notification-system)
8. [Implementation Plan](#8-implementation-plan)
9. [File Structure](#9-file-structure)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [Monitoring & Alerts](#12-monitoring--alerts)

---

## 1. Overview

### What This Covers

- Firebase project setup (Auth, Firestore, Functions, FCM)
- Cloud Functions for job scraping, user lifecycle, notifications
- Firestore schema and security rules
- Scheduled jobs and triggers
- All backend infrastructure needed before iOS development

### What This Does NOT Cover

- iOS app implementation (see `ios/SPEC.md`)
- UI/UX details
- Client-side logic

### Success Criteria

Backend is "done" when:
- [ ] Jobs are being scraped every 4 hours from all 3 sources
- [ ] New users get Firestore documents on auth
- [ ] Security rules enforce user isolation
- [ ] Notification scheduling works via Cloud Tasks
- [ ] Can be tested entirely via Firebase console + curl

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Data Sources                      Firebase                        │
│   ────────────                      ───────                         │
│                                                                     │
│   ┌──────────────────┐         ┌─────────────────────────────────┐ │
│   │ GitHub Repos     │         │                                 │ │
│   │                  │         │  Cloud Functions                │ │
│   │ • speedyapply/   │────────▶│  • scrapeJobs (scheduled)       │ │
│   │   2026-SWE-      │         │  • onUserCreate (trigger)       │ │
│   │   College-Jobs   │         │  • onApplicationWrite (trigger) │ │
│   │                  │         │  • sendNotification (task)      │ │
│   │ • vanshb03/      │         │                                 │ │
│   │   Summer2026-    │         └───────────┬─────────────────────┘ │
│   │   Internships    │                     │                       │
│   │   (+ offseason)  │                     ▼                       │
│   └──────────────────┘         ┌─────────────────────────────────┐ │
│                                │                                 │ │
│                                │  Firestore                      │ │
│   External Services            │  • /jobs (scraped listings)     │ │
│   ─────────────────            │  • /users/{uid}                 │ │
│                                │  • /users/{uid}/applications    │ │
│   ┌──────────────────┐         │                                 │ │
│   │ Cloud Scheduler  │────────▶│  FCM                            │ │
│   │ (every 4 hours)  │         │  • Push notifications           │ │
│   └──────────────────┘         │                                 │ │
│                                │  Cloud Tasks                    │ │
│   ┌──────────────────┐         │  • Scheduled notifications      │ │
│   │ Cloud Tasks      │────────▶│                                 │ │
│   │ (notification    │         │  Auth                           │ │
│   │  delivery)       │         │  • Apple Sign-In                │ │
│   └──────────────────┘         │  • Google Sign-In               │ │
│                                │                                 │ │
│                                └─────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20 |
| Functions Framework | Firebase Functions v2 |
| Database | Firestore |
| Auth | Firebase Auth |
| Push Notifications | FCM |
| Task Queue | Cloud Tasks |
| Scheduler | Cloud Scheduler |
| Language | TypeScript |

---

## 3. Data Models

### Job

```typescript
interface Job {
  id: string
  company: string
  role: string
  location: string
  url: string
  season: 'summer2026' | 'fall2025' | 'winter2026' | 'spring2026' | 'offseason'
  datePosted: Timestamp | null
  deadline: Timestamp | null
  sponsorship: 'Yes' | 'No' | 'Unknown' | null
  source: 'speedyapply' | 'vanshb03' | 'vanshb03-offseason'
  sourceHash: string              // SHA256(company + role + location + season)
  createdAt: Timestamp
  updatedAt: Timestamp
  isActive: boolean
}
```

### User

```typescript
interface User {
  uid: string
  email: string
  displayName: string
  photoURL: string | null
  fcmToken: string | null
  notificationsEnabled: boolean
  tags: string[]                  // user's custom tag library
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Application

```typescript
interface Application {
  id: string
  jobId: string | null            // null if manual entry
  company: string
  role: string
  location: string
  url: string | null
  salary: string | null
  tags: string[]
  notes: string | null
  notificationsEnabled: boolean
  stages: Stage[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface Stage {
  id: string                      // UUID
  type: StageType
  name: string                    // display name, can be customized
  status: 'pending' | 'current' | 'completed' | 'skipped'
  deadline: Timestamp | null
  completedAt: Timestamp | null
  notes: string | null
  order: number
}

type StageType =
  // Pre-Application
  | 'saved'
  | 'preparing_materials'
  | 'waiting_for_referral'
  // Screening
  | 'applied'
  | 'oa'
  | 'ai_coding_screen'
  | 'ai_chat_screen'
  | 'recruiter_call'
  | 'phone_screen'
  // Technical
  | 'tech_round_1'
  | 'tech_round_2'
  | 'tech_round_3'
  | 'system_design'
  | 'take_home_project'
  // Behavioral
  | 'behavioral_round'
  | 'hiring_manager'
  // Final
  | 'team_matching'
  | 'final_round'
  | 'reference_check'
  | 'background_check'
  // Outcome
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_declined'
  | 'rejected'
  | 'withdrawn'
  | 'ghosted'
```

### ScheduledNotification

```typescript
interface ScheduledNotification {
  id: string
  userId: string
  applicationId: string
  stageId: string
  type: 'deadline_3d' | 'deadline_1d' | 'deadline_0d' | 'stale'
  scheduledFor: Timestamp
  sent: boolean
  createdAt: Timestamp
}
```

---

## 4. Cloud Functions

### 4.1 scrapeJobs

**Type:** Scheduled (Cloud Scheduler)  
**Schedule:** Every 4 hours (`0 */4 * * *`)  
**Timeout:** 5 minutes  
**Memory:** 1GB

```typescript
// Pseudocode
async function scrapeJobs() {
  const sources = [
    { name: 'speedyapply', url: 'https://raw.githubusercontent.com/speedyapply/2026-SWE-College-Jobs/main/README.md' },
    { name: 'vanshb03', url: 'https://raw.githubusercontent.com/vanshb03/Summer2026-Internships/dev/README.md' },
    { name: 'vanshb03-offseason', url: 'https://raw.githubusercontent.com/vanshb03/Summer2026-Internships/dev/OFFSEASON_README.md' },
  ]

  for (const source of sources) {
    const markdown = await fetchMarkdown(source.url)
    const jobs = parseMarkdownTable(markdown, source.name)
    await upsertJobs(jobs)
  }

  await markInactiveJobs()  // jobs not seen this run
  await logScraperStats()
}
```

**Error Handling:**
- Retry individual source 3x with exponential backoff
- Continue to next source on persistent failure
- Alert if >30% parse failure rate
- Never fail the entire function for one bad source

### 4.2 onUserCreate

**Type:** Auth trigger  
**Trigger:** `functions.auth.user().onCreate()`

```typescript
async function onUserCreate(user: UserRecord) {
  const userData: User = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? null,
    fcmToken: null,
    notificationsEnabled: true,
    tags: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await firestore.doc(`users/${user.uid}`).set(userData)
}
```

### 4.3 onApplicationWrite

**Type:** Firestore trigger  
**Trigger:** `onDocumentWritten('users/{userId}/applications/{applicationId}')`

```typescript
async function onApplicationWrite(event) {
  const before = event.data?.before?.data() as Application | undefined
  const after = event.data?.after?.data() as Application | undefined
  const userId = event.params.userId
  const applicationId = event.params.applicationId

  if (!after) {
    // Document deleted, cancel all scheduled notifications
    await cancelNotifications(userId, applicationId)
    return
  }

  // Find stages with deadlines that changed
  const beforeStages = new Map(before?.stages?.map(s => [s.id, s]) ?? [])
  
  for (const stage of after.stages) {
    const beforeStage = beforeStages.get(stage.id)
    const deadlineChanged = stage.deadline?.toMillis() !== beforeStage?.deadline?.toMillis()

    if (deadlineChanged) {
      await cancelStageNotifications(userId, applicationId, stage.id)
      
      if (stage.deadline && after.notificationsEnabled) {
        await scheduleDeadlineNotifications(userId, applicationId, stage)
      }
    }
  }
}
```

### 4.4 sendNotification

**Type:** Cloud Tasks HTTP handler  
**Endpoint:** `/sendNotification`

```typescript
async function sendNotification(req: Request) {
  const { notificationId } = req.body

  const notifDoc = await firestore.doc(`scheduledNotifications/${notificationId}`).get()
  const notification = notifDoc.data() as ScheduledNotification

  if (!notification || notification.sent) return

  const user = await firestore.doc(`users/${notification.userId}`).get()
  const fcmToken = user.data()?.fcmToken

  if (!fcmToken) {
    await notifDoc.ref.update({ sent: true })  // mark sent to avoid retries
    return
  }

  const application = await firestore
    .doc(`users/${notification.userId}/applications/${notification.applicationId}`)
    .get()
  
  const appData = application.data() as Application
  const stage = appData.stages.find(s => s.id === notification.stageId)

  const message = buildNotificationMessage(notification.type, appData, stage)

  await messaging.send({
    token: fcmToken,
    notification: {
      title: message.title,
      body: message.body,
    },
    data: {
      applicationId: notification.applicationId,
      stageId: notification.stageId,
    },
    apns: {
      payload: {
        aps: { sound: 'default' }
      }
    }
  })

  await notifDoc.ref.update({ sent: true })
}
```

---

## 5. Firestore Schema & Rules

### Collections

```
/jobs/{jobId}                           # Scraped job listings (read-only for clients)
/users/{userId}                         # User profiles
/users/{userId}/applications/{appId}    # User's tracked applications
/scheduledNotifications/{notifId}       # Internal: notification queue
```

### Security Rules

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
      allow read: if request.auth != null && request.auth.uid == userId;
      
      allow create: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.data.keys().hasAll(['uid', 'email', 'notificationsEnabled'])
        && request.resource.data.uid == userId;
      
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['uid', 'createdAt']);

      allow delete: if request.auth != null && request.auth.uid == userId;

      // Applications subcollection
      match /applications/{appId} {
        allow read: if request.auth != null && request.auth.uid == userId;

        allow create: if request.auth != null 
          && request.auth.uid == userId
          && request.resource.data.keys().hasAll(['company', 'role', 'stages'])
          && request.resource.data.stages.size() > 0;

        allow update: if request.auth != null 
          && request.auth.uid == userId;

        allow delete: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Scheduled notifications: server-only
    match /scheduledNotifications/{notifId} {
      allow read, write: if false;
    }
  }
}
```

### Indexes

```
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "jobs",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "season", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "jobs",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "applications",
      "fields": [
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "scheduledNotifications",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "applicationId", "order": "ASCENDING" },
        { "fieldPath": "sent", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 6. Job Scraper

### Source Formats

**speedyapply/2026-SWE-College-Jobs:**
```markdown
| Company | Role | Location | Application/Link | Date Posted |
| ------- | ---- | -------- | ---------------- | ----------- |
| Google | SWE Intern | Mountain View, CA | [Apply](https://...) | Jan 15 |
```

**vanshb03/Summer2026-Internships:**
```markdown
| Company | Role | Location | Application/Link | Date Posted |
| ------- | ---- | -------- | ---------------- | ----------- |
| Meta | Software Engineer Intern | Menlo Park, CA | <a href="...">Apply</a> | 01/15 |
```

Columns may vary. Parser must handle:
- Different column orders
- Missing columns
- Links as markdown `[text](url)` or HTML `<a href="url">text</a>`
- Various date formats
- Unicode characters in company names
- Rows with missing data

### Parsing Strategy

```typescript
interface ParsedJob {
  company: string
  role: string
  location: string
  url: string
  datePosted: Date | null
  sponsorship: string | null
}

function parseMarkdownTable(markdown: string, source: string): ParsedJob[] {
  // 1. Find table start (header row with |)
  // 2. Parse header to determine column indices
  // 3. Skip separator row (|----|)
  // 4. Parse each data row
  // 5. Extract links from markdown or HTML
  // 6. Normalize dates
  // 7. Skip rows with missing required fields (company, role)
  
  const jobs: ParsedJob[] = []
  const lines = markdown.split('\n')
  
  let inTable = false
  let columnMap: Map<string, number> = new Map()
  
  for (const line of lines) {
    if (!line.includes('|')) {
      inTable = false
      continue
    }
    
    const cells = line.split('|').map(c => c.trim()).filter(c => c)
    
    if (isHeaderRow(cells)) {
      columnMap = buildColumnMap(cells)
      inTable = true
      continue
    }
    
    if (isSeparatorRow(line)) continue
    
    if (inTable && cells.length >= 2) {
      const job = extractJob(cells, columnMap, source)
      if (job) jobs.push(job)
    }
  }
  
  return jobs
}
```

### Deduplication

```typescript
function generateSourceHash(job: ParsedJob, season: string): string {
  const normalized = [
    job.company.toLowerCase().trim(),
    job.role.toLowerCase().trim(),
    job.location.toLowerCase().trim(),
    season
  ].join('|')
  
  return crypto.createHash('sha256').update(normalized).digest('hex')
}
```

### Upsert Logic

```typescript
async function upsertJobs(jobs: ParsedJob[], source: string) {
  const batch = firestore.batch()
  const seenHashes = new Set<string>()
  
  for (const job of jobs) {
    const hash = generateSourceHash(job, inferSeason(source))
    seenHashes.add(hash)
    
    const existing = await firestore
      .collection('jobs')
      .where('sourceHash', '==', hash)
      .limit(1)
      .get()
    
    if (existing.empty) {
      const ref = firestore.collection('jobs').doc()
      batch.set(ref, {
        ...job,
        id: ref.id,
        sourceHash: hash,
        source,
        season: inferSeason(source),
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      const ref = existing.docs[0].ref
      batch.update(ref, {
        ...job,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  }
  
  await batch.commit()
  return seenHashes
}
```

---

## 7. Notification System

### Scheduling Flow

1. User sets deadline on a stage
2. `onApplicationWrite` trigger fires
3. Function calculates notification times: deadline - 3 days, - 1 day, - 0 days
4. Creates `ScheduledNotification` documents
5. Creates Cloud Tasks for each notification time
6. Cloud Task calls `sendNotification` at scheduled time
7. `sendNotification` sends FCM and marks notification as sent

### Cloud Tasks Setup

```typescript
import { CloudTasksClient } from '@google-cloud/tasks'

const tasksClient = new CloudTasksClient()
const project = process.env.GCLOUD_PROJECT
const location = 'us-central1'
const queue = 'notification-queue'

async function scheduleNotification(
  userId: string,
  applicationId: string,
  stage: Stage,
  type: 'deadline_3d' | 'deadline_1d' | 'deadline_0d',
  scheduledFor: Date
) {
  if (scheduledFor <= new Date()) return  // don't schedule past notifications
  
  const notifRef = firestore.collection('scheduledNotifications').doc()
  
  await notifRef.set({
    id: notifRef.id,
    userId,
    applicationId,
    stageId: stage.id,
    type,
    scheduledFor: Timestamp.fromDate(scheduledFor),
    sent: false,
    createdAt: FieldValue.serverTimestamp(),
  })
  
  const parent = tasksClient.queuePath(project, location, queue)
  
  await tasksClient.createTask({
    parent,
    task: {
      httpRequest: {
        httpMethod: 'POST',
        url: `https://${location}-${project}.cloudfunctions.net/sendNotification`,
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify({ notificationId: notifRef.id })).toString('base64'),
      },
      scheduleTime: { seconds: Math.floor(scheduledFor.getTime() / 1000) },
    },
  })
}
```

### Notification Messages

```typescript
function buildNotificationMessage(
  type: string,
  application: Application,
  stage: Stage | undefined
): { title: string; body: string } {
  const company = application.company
  const stageName = stage?.name ?? 'stage'
  
  switch (type) {
    case 'deadline_3d':
      return {
        title: `${company} deadline in 3 days`,
        body: `Your ${stageName} is due soon.`,
      }
    case 'deadline_1d':
      return {
        title: `${company} deadline tomorrow`,
        body: `Don't forget: ${stageName} is due tomorrow.`,
      }
    case 'deadline_0d':
      return {
        title: `${company} deadline today`,
        body: `${stageName} is due today!`,
      }
    case 'stale':
      return {
        title: `Any updates from ${company}?`,
        body: `It's been 2 weeks. Might be worth following up.`,
      }
    default:
      return { title: company, body: 'You have an update.' }
  }
}
```

---

## 8. Implementation Plan

### Phase B1: Project Setup (Day 1)

| Task | Description |
|------|-------------|
| B1.1 | Create Firebase project in console |
| B1.2 | Enable Auth (Apple, Google providers) |
| B1.3 | Create Firestore database (production mode) |
| B1.4 | Enable Cloud Functions |
| B1.5 | Enable Cloud Tasks API |
| B1.6 | Initialize `backend/` with `firebase init functions` |
| B1.7 | Configure TypeScript, ESLint, Prettier |
| B1.8 | Set up environment variables |

**Deliverable:** Empty Functions project deploys successfully.

### Phase B2: Data Models & Rules (Day 2)

| Task | Description |
|------|-------------|
| B2.1 | Define TypeScript interfaces in `types/` |
| B2.2 | Write Firestore security rules |
| B2.3 | Define Firestore indexes |
| B2.4 | Deploy rules and indexes |
| B2.5 | Test rules with Firebase console |

**Deliverable:** Can manually create/read documents with correct permissions.

### Phase B3: User Lifecycle (Day 3)

| Task | Description |
|------|-------------|
| B3.1 | Implement `onUserCreate` function |
| B3.2 | Deploy and test with manual Auth user creation |
| B3.3 | Implement FCM token update endpoint (for later iOS use) |
| B3.4 | Test user document creation |

**Deliverable:** Creating a user in Auth console creates Firestore doc.

### Phase B4: Job Scraper (Days 4-6)

| Task | Description |
|------|-------------|
| B4.1 | Implement markdown fetcher with retry logic |
| B4.2 | Implement speedyapply parser |
| B4.3 | Implement vanshb03 parser |
| B4.4 | Implement deduplication logic |
| B4.5 | Implement upsert logic |
| B4.6 | Implement inactive job marking |
| B4.7 | Add logging and stats |
| B4.8 | Write unit tests for parsers |
| B4.9 | Deploy `scrapeJobs` function |
| B4.10 | Set up Cloud Scheduler (every 4 hours) |
| B4.11 | Run manually, verify jobs in Firestore |

**Deliverable:** Jobs collection populated with real data, updating every 4 hours.

### Phase B5: Application Triggers (Days 7-8)

| Task | Description |
|------|-------------|
| B5.1 | Implement `onApplicationWrite` function |
| B5.2 | Implement deadline change detection |
| B5.3 | Implement notification scheduling helper |
| B5.4 | Implement notification cancellation helper |
| B5.5 | Deploy and test with manual Firestore edits |
| B5.6 | Verify scheduled notifications in Firestore |

**Deliverable:** Editing application deadlines creates/cancels notification docs.

### Phase B6: Notification Delivery (Days 9-10)

| Task | Description |
|------|-------------|
| B6.1 | Create Cloud Tasks queue |
| B6.2 | Implement `sendNotification` HTTP function |
| B6.3 | Implement FCM message building |
| B6.4 | Wire up Cloud Tasks scheduling |
| B6.5 | Test end-to-end with manual FCM token |
| B6.6 | Add error handling and retries |

**Deliverable:** Setting a deadline schedules a task that sends FCM.

### Phase B7: Polish & Monitoring (Day 11)

| Task | Description |
|------|-------------|
| B7.1 | Add structured logging |
| B7.2 | Set up error alerting |
| B7.3 | Create scraper health dashboard |
| B7.4 | Document API for iOS team |
| B7.5 | Final testing pass |

**Deliverable:** Production-ready backend with monitoring.

---

## 9. File Structure

```
backend/
├── functions/
│   ├── src/
│   │   ├── index.ts                 # Function exports
│   │   │
│   │   ├── triggers/
│   │   │   ├── onUserCreate.ts
│   │   │   └── onApplicationWrite.ts
│   │   │
│   │   ├── scheduled/
│   │   │   └── scrapeJobs.ts
│   │   │
│   │   ├── http/
│   │   │   ├── sendNotification.ts
│   │   │   └── updateFcmToken.ts
│   │   │
│   │   ├── scrapers/
│   │   │   ├── index.ts
│   │   │   ├── fetcher.ts
│   │   │   ├── speedyapplyParser.ts
│   │   │   ├── vanshb03Parser.ts
│   │   │   └── deduplicator.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── scheduler.ts
│   │   │   ├── messenger.ts
│   │   │   └── messages.ts
│   │   │
│   │   ├── types/
│   │   │   ├── job.ts
│   │   │   ├── user.ts
│   │   │   ├── application.ts
│   │   │   └── notification.ts
│   │   │
│   │   └── utils/
│   │       ├── firestore.ts
│   │       ├── logger.ts
│   │       └── retry.ts
│   │
│   ├── test/
│   │   ├── scrapers/
│   │   │   ├── speedyapplyParser.test.ts
│   │   │   └── vanshb03Parser.test.ts
│   │   ├── triggers/
│   │   │   └── onApplicationWrite.test.ts
│   │   └── fixtures/
│   │       ├── speedyapply-sample.md
│   │       └── vanshb03-sample.md
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.js
│   └── .prettierrc
│
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── .firebaserc
```

---

## 10. Testing

### Unit Tests

| ID | Area | Description |
|----|------|-------------|
| UT-B1 | Parser | speedyapplyParser extracts jobs from sample markdown |
| UT-B2 | Parser | vanshb03Parser handles different column orders |
| UT-B3 | Parser | Parser extracts markdown links correctly |
| UT-B4 | Parser | Parser extracts HTML links correctly |
| UT-B5 | Parser | Parser handles missing optional columns |
| UT-B6 | Parser | Parser skips rows with missing required fields |
| UT-B7 | Dedup | sourceHash is deterministic |
| UT-B8 | Dedup | Different jobs produce different hashes |
| UT-B9 | Messages | Notification messages are correct for each type |

### Integration Tests

| ID | Area | Description |
|----|------|-------------|
| IT-B1 | Auth | onUserCreate creates Firestore document |
| IT-B2 | Scraper | scrapeJobs fetches and parses real repos |
| IT-B3 | Scraper | Duplicate jobs are updated, not duplicated |
| IT-B4 | Trigger | onApplicationWrite detects deadline changes |
| IT-B5 | Trigger | Notification is scheduled when deadline set |
| IT-B6 | Trigger | Notification is cancelled when deadline removed |
| IT-B7 | Notif | sendNotification sends FCM message |

### Manual Test Checklist

- [ ] Create Auth user → Firestore doc appears
- [ ] Run scrapeJobs → Jobs collection populated
- [ ] Run scrapeJobs again → No duplicates, updatedAt changes
- [ ] Edit application deadline in console → ScheduledNotification created
- [ ] Verify Cloud Task is scheduled
- [ ] Wait for task to fire → FCM sent (check with test device)

---

## 11. Deployment

### First Deploy

```bash
cd backend/functions

# Install dependencies
npm install

# Build
npm run build

# Deploy everything
firebase deploy

# Or deploy individually
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Environment Variables

```bash
# Set in Firebase console or via CLI
firebase functions:config:set \
  github.token="ghp_xxxx" \
  notifications.queue="notification-queue"
```

### Cloud Tasks Queue Setup

```bash
gcloud tasks queues create notification-queue \
  --location=us-central1 \
  --max-attempts=3 \
  --min-backoff=60s \
  --max-backoff=600s
```

### Cloud Scheduler Setup

```bash
gcloud scheduler jobs create http scrape-jobs \
  --location=us-central1 \
  --schedule="0 */4 * * *" \
  --uri="https://us-central1-PROJECT_ID.cloudfunctions.net/scrapeJobs" \
  --http-method=POST \
  --oidc-service-account-email=PROJECT_ID@appspot.gserviceaccount.com
```

---

## 12. Monitoring & Alerts

### Logging

```typescript
import { logger } from 'firebase-functions'

// Structured logging
logger.info('Scrape completed', {
  source: 'speedyapply',
  jobsFound: 150,
  jobsNew: 12,
  jobsUpdated: 138,
  duration: 4500,
})

logger.error('Parse failed', {
  source: 'vanshb03',
  error: error.message,
  line: problematicLine,
})
```

### Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Scraper success rate | Cloud Functions logs | < 90% |
| Jobs parsed per run | Custom log | < 50% of previous run |
| Parse error rate | Custom log | > 20% |
| Notification delivery rate | FCM console | < 95% |
| Function error rate | Cloud Functions dashboard | > 5% |
| Function duration | Cloud Functions dashboard | > 60s avg |

### Alerting

Set up in Google Cloud Monitoring:
- Alert on function errors > 5/hour
- Alert on scraper producing 0 jobs
- Alert on notification function failures

---

**End of Backend Spec**
