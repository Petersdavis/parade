# Parade Frontend

Next.js (App Router) + TypeScript frontend for Parade, built as a **fully static
site** and served from Firebase Hosting's CDN.

## Static rendering model

This app uses Next.js **static export** (`output: "export"` in
[`next.config.ts`](next.config.ts:1)). Every page is rendered to HTML/CSS/JS at
**build time** — there is no Node server running on requests.

Consequences:

- No dynamic route handlers, middleware, server actions, or ISR.
- No per-request cookies/headers.
- Auth/session and real-time data are handled **client-side** via the Firebase SDK.
- `next build` emits the static bundle into `out/`, which Firebase Hosting serves.

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in Firebase web config
npm run dev
```

## Scripts

| Script                 | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the dev server at http://localhost:3000 |
| `npm run build`        | Static export into `out/`                     |
| `npm run lint`         | ESLint (Next.js core-web-vitals + TypeScript) |
| `npm run format`       | Prettier write                                |
| `npm run format:check` | Prettier check (used in CI)                   |
| `npm run typecheck`    | `tsc --noEmit`                                |
| `npm run serve:static` | Serve the built `out/` directory locally      |

## Environment

All Firebase config is read from `NEXT_PUBLIC_*` variables (see
[`.env.example`](.env.example:1)). These are public values inlined at build time;
access control is enforced by Firestore/Storage security rules.

| Variable                                   | Purpose                                    |
| ------------------------------------------ | ------------------------------------------ |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase web API key                       |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase Auth domain                       |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase project ID                        |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Cloud Storage bucket                       |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging sender ID                  |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase web app ID                        |
| `NEXT_PUBLIC_FIREBASE_USE_EMULATORS`       | `true` to point the SDK at local emulators |

### CI secrets

The GitHub Actions workflows build the static bundle, so every
`NEXT_PUBLIC_FIREBASE_*` value above must be available at build time. Add them as
**repository secrets** (Settings → Secrets and variables → Actions) and expose
them to the build step as environment variables. `NEXT_PUBLIC_FIREBASE_USE_EMULATORS`
should be `false` for deployed builds.

## Authentication

Auth is entirely client-side (see the static rendering model above). The flow
lives in [`src/lib/auth.ts`](src/lib/auth.ts:1) with a React context in
[`src/components/auth/AuthProvider.tsx`](src/components/auth/AuthProvider.tsx:1).

- **Email/password** — sign-up and sign-in via the Firebase Auth SDK.
- **Google OAuth** — popup sign-in via `GoogleAuthProvider`.
- On first sign-up a `users/{uid}` profile document is created (idempotent; safe
  to call on every sign-in). Profile provisioning is **best-effort** — a Firestore
  failure is logged but never blocks authentication or the post-login redirect.
- Redirects are **reactive**: the login/register pages watch auth state and
  `router.replace("/")` once a user is present, rather than relying on an
  imperative push racing the auth listener.

### Enabling the Google provider

Google sign-in requires the provider to be enabled in the Firebase console:

1. Firebase console → **Authentication** → **Sign-in method**.
2. Enable **Email/Password**.
3. Enable **Google**, set a project support email, and save.
4. Under **Authentication → Settings → Authorized domains**, add every hostname
   that serves the app (e.g. `localhost` and your Firebase Hosting domains).

### Firestore

The `users` collection is the only collection required for authentication. Deploy
the rules in [`../firestore.rules`](../firestore.rules:1) so each user can read and
write only their own document:

```bash
firebase deploy --only firestore:rules
```

### Local emulators

Set `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true` in `.env.local` to run against the
Firebase Emulator Suite (configured in [`../firebase.json`](../firebase.json:1)).
Start them with `firebase emulators:start` from the repo root.

## Deployment

Firebase Hosting serves the `out/` directory. The GitHub Actions workflows in
[`../.github/workflows/`](../.github/workflows/) build the app and deploy it.
