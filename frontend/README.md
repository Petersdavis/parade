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
| `npm test`             | Run the Vitest suite once                     |
| `npm run test:watch`   | Run Vitest in watch mode                      |
| `npm run serve:static` | Serve the built `out/` directory locally      |

## Environment

All Firebase config is read from `NEXT_PUBLIC_*` variables (see
[`.env.example`](.env.example:1)). These are public values inlined at build time;
access control is enforced by Firestore/Storage security rules.

## Authentication

Auth is handled entirely **client-side** with the Firebase SDK (see
[`src/lib/auth.ts`](src/lib/auth.ts:1)):

- Email/password sign-up and sign-in (`signUpWithEmail`, `signInWithEmail`).
- Google OAuth via popup (`signInWithGoogle`).
- A `users/{uid}` profile document is created on first sign-up by
  `ensureUserProfile` (idempotent — safe to call on every sign-in).
- Auth state is exposed to the tree through
  [`src/components/auth/AuthProvider.tsx`](src/components/auth/AuthProvider.tsx:1)
  (`useAuth()` → `{ user, loading }`).
- Input validation lives in [`src/lib/validation.ts`](src/lib/validation.ts:1);
  Firebase error codes are translated to friendly copy by `getAuthErrorMessage`.

### Enabling the Google provider

Google sign-in requires a one-time console setup (cannot be scripted from the
repo):

1. Open the [Firebase console](https://console.firebase.google.com/) and select
   the `parade-dev-511513` project.
2. Go to **Build → Authentication → Sign-in method**.
3. Enable **Google**, choose a support email, and save.
4. Under **Authentication → Settings → Authorized domains**, ensure the domains
   that will serve the app (e.g. `localhost`, `parade-dev-511513.firebaseapp.com`,
   and the production domain) are listed.

### Tests

Component and unit tests use **Vitest** + **Testing Library**
([`vitest.config.ts`](vitest.config.ts:1)). Tests mock `@/lib/auth` and
`next/navigation`, so no live Firebase project is needed to run them.

## Deployment

Firebase Hosting serves the `out/` directory. The GitHub Actions workflows in
[`../.github/workflows/`](../.github/workflows/) build the app and deploy it.

The deploy workflows inject the Firebase web config from repository secrets.
Add these under **Settings → Secrets and variables → Actions**:

| Secret                                     |
| ------------------------------------------ |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              |

`FIREBASE_SERVICE_ACCOUNT_PARADE_DEV_511513` is also required for the Hosting
deploy step. CI ([`frontend-ci.yml`](../.github/workflows/frontend-ci.yml))
runs lint, format check, typecheck, tests, and a static build using placeholder
config, so it does not need the real secrets.
