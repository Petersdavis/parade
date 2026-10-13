# Parade 🐘

> A co-parenting and co-habitation platform for single mothers — inspired by the Parade of elephants, where matriarchs raise children collectively.

## About

**Parade** is a matchmaking platform similar to Plenty of Fish, but designed specifically for single mothers seeking to co-parent and co-habitate. The name draws from the elephant matriarchal structure, where a parade of mothers collectively raises the young.

## Project Roadmap

### Step 1: User Authentication & Verification

- [ ] User registration (email/password, OAuth providers)
- [ ] Email verification flow
- [ ] Identity verification (government ID upload, background check integration)
- [ ] IP geofencing — flag users connecting from outside the community's geographic region as non-local
- [ ] Password reset flow
- [ ] Account deletion and data privacy controls

### Step 2: Profile Building (Form)

- [ ] Quick and painless multi-step profile creation wizard
- [ ] Design profile schema for fuzzy matching via Elasticsearch
- [ ] Personal details (name, age, location, photo upload)
- [ ] Housing preference: looking for shared accommodation OR have accommodation to share
- [ ] Target rent amount
- [ ] Lifestyle preferences (comfort with male visitors, smoking, drinking)
- [ ] Number of children, current pets

### Step 3: Profile Matching & List

- [ ] Search/filter interface (location, age range, children ages, lifestyle preferences)
- [ ] Swipe or browse-style profile discovery
- [ ] Match algorithm (compatibility scoring based on preferences and values)
- [ ] Saved searches and notifications for new matches
- [ ] "Like" / "Pass" interaction tracking
- [ ] Mutual match detection and notification
- [ ] Block and report functionality

### Step 4: Direct Messaging Between Profiles

- [ ] Real-time chat via Firestore `onSnapshot()` listeners (built-in WebSocket, no separate server)
- [ ] Message inbox — query `conversations` where `participants hasAny [myUid]`
- [ ] Conversation threading with last-message preview and unread counts
- [ ] Read receipts and typing indicators
- [ ] Media sharing (images, documents) via Firebase Storage with safety scanning
- [ ] Message reporting and blocking within conversations
- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Optional icebreaker prompts to start conversations

## Tech Stack

### Architecture Overview

```
Firebase Auth ──► Firestore ──► Firebase Functions ──► Elasticsearch (VPS)
   (Step 1)         (Step 2)        (sync on create/write)    (Step 3 matching)
                        │
                        ▼
                 Firestore real-time listeners ──► Chat (Step 4)
```

All backend logic lives in Firebase. Elasticsearch is the only external service, running on a cheap VPS. Firestore triggers (`onCreate`, `onUpdate`) sync profile data to Elasticsearch indexes via Firebase Functions.

### Messaging Architecture

**Data model:**

```
conversations/{conversationId}
  ├── participants: ["userA", "userB"]          // array of UIDs
  ├── lastMessage: { text, senderId, timestamp } // for inbox preview
  ├── unreadCount: { userA: 0, userB: 1 }        // per-participant
  ├── createdAt: Timestamp
  └── messages/{messageId}                       // sub-collection
       ├── senderId: "userA"
       ├── text: "Hey, would you like to chat?"
       ├── timestamp: Timestamp
       └── attachment: { type: "image", url: "..." }  // optional
```

**Security Rules (ACL):**

```js
match /conversations/{conversationId} {
  // Only participants can read the conversation or its messages
  allow read: if request.auth != null &&
    resource.data.participants.hasAny([request.auth.uid]);

  // Creator must include themselves as a participant
  allow create: if request.auth != null &&
    request.resource.data.participants.hasAll([request.auth.uid]);

  // Only participants can update (mark read, add participants)
  allow update: if request.auth != null &&
    resource.data.participants.hasAny([request.auth.uid]);

  // Messages inherit parent conversation access
  match /messages/{messageId} {
    allow read: if request.auth != null &&
      get(/databases/$(database)/documents/conversations/$(conversationId))
        .data.participants.hasAny([request.auth.uid]);

    // Sender UID must match authenticated user
    allow create: if request.auth != null &&
      request.resource.data.senderId == request.auth.uid;
  }
}
```

**Real-time delivery (no separate WebSocket server):**

Firestore SDK's `onSnapshot()` opens a WebSocket connection to Firebase automatically. The frontend subscribes to changes:

```js
// Inbox — real-time list of conversations
db.collection('conversations')
  .where('participants', 'array-contains', user.uid)
  .orderBy('lastMessage.timestamp', 'desc')
  .onSnapshot(snapshot => { /* update UI */ });

// Active conversation — real-time message stream
db.collection('conversations')
  .doc(conversationId)
  .collection('messages')
  .orderBy('timestamp')
  .onSnapshot(snapshot => { /* append new messages */ });
```

No message broker (Pub/Sub, RabbitMQ, etc.) is needed at low volume. Firestore handles the fan-out natively — each participant's `onSnapshot()` receives the new message within a few hundred milliseconds.

### Search & Matching

- [x] **Elasticsearch** — fuzzy matching on profile fields (location, rent range, lifestyle, children/pets). Best fit for the core matching feature.
  - **Cheapest deploy options (ranked):**
    1. **Self-hosted on a low-cost VPS** (e.g., Hetzner CX22 ~€3.89/mo) via Docker Compose — ~$4–6/mo, full control, requires ~2GB RAM
    2. **Bonsai.io** managed Elasticsearch (125MB plan) — ~$10/mo, zero ops
    3. **Searchly** managed Elasticsearch (125MB plan) — ~$10/mo, zero ops
    4. **AWS OpenSearch Serverless** — pay-per-request, good for spiky traffic
    5. **Elastic Cloud** — ~$30/mo, official support

### Backend (Firebase)

- [x] **Firebase Auth** — authentication, email verification, password reset, OAuth providers
- [x] **Cloud Firestore** — profile document storage (source of truth), chat messages
- [x] **Firebase Functions** — Elasticsearch index sync on Firestore `onCreate` / `onUpdate` triggers
- [x] **Firebase Cloud Messaging** — push notifications for new messages and matches
- [ ] **File/image storage** — Firebase Storage (built-in, S3-compatible)

### Frontend

- [x] Frontend framework: Next.js
- [ ] Real-time messaging — Firestore real-time listeners (no separate WebSocket server needed)

### Infrastructure

- [x] **Elasticsearch VPS** — single Hetzner CX22 (~€3.89/mo) or similar low-cost VPS running Elasticsearch via Docker Compose
- [ ] Firebase project setup (Blaze plan — pay-as-you-go, but stays free at low volume)
- [ ] Domain + SSL

### Deployment Decision

- [x] **Frontend:** Next.js
- [x] **Backend:** Firebase Functions + Firestore + Firebase Auth
- [x] **Search:** Elasticsearch on a low-cost VPS

### Firebase Functions Performance and Cost Guidance

To keep Firebase Functions fast while staying close to the free/low-cost tier:

- Keep functions **small and event-driven**; avoid building a monolithic function that handles unrelated work.
- Prefer **2nd gen functions** for better concurrency and more predictable scaling behavior.
- Use **region pinning** so Functions, Firestore, Auth, and Storage are deployed in the same region when possible.
- Reduce cold starts by:
  - keeping dependency bundles small
  - avoiding heavy initialization in the global scope
  - importing only what each function needs
- Use **Firestore triggers only for essential write-side sync**, such as indexing profiles into Elasticsearch.
- Make sync handlers **idempotent** so retries do not create duplicate work.
- Batch writes and external calls where possible, especially for Elasticsearch updates.
- Offload expensive work to background jobs only when necessary; keep the main request path thin.
- Avoid high-frequency polling; use Firestore listeners and event triggers instead.
- Monitor invocation counts and document reads/writes carefully, since those usually drive cost more than raw CPU time.
- Cache stable reference data outside of function execution paths when possible.

The practical goal is to reserve Functions for orchestration and side effects, not heavy synchronous computation.

## Getting Started

*Coming soon — setup instructions will be added once the tech stack is decided.*

## License

*To be determined.*
