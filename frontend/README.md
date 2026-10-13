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

## Deployment

Firebase Hosting serves the `out/` directory. The GitHub Actions workflows in
[`../.github/workflows/`](../.github/workflows/) build the app and deploy it.
