/**
 * Firebase Admin SDK bootstrap.
 *
 * The Admin SDK does NOT auto-initialize: any call to `getFirestore()` (or any
 * other Admin service) throws "The default Firebase app does not exist" unless
 * `initializeApp()` has run first.
 *
 * This module initializes the default app as a side effect of being imported,
 * so importing it *before* any module that touches an Admin service guarantees
 * the app exists. `index.ts` imports it first for exactly that reason.
 *
 * The guard keeps initialization idempotent: in the Functions runtime the app
 * is normally created here, but during local emulation or tests it may already
 * exist, and calling `initializeApp()` twice would throw.
 */

import {getApps, initializeApp} from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp();
}
