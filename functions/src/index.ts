/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {defineString, defineSecret} from "firebase-functions/params";

import {onRequest} from "firebase-functions/v2/https";
import * as https from "https";

// Initialize the Firebase Admin SDK before any module that uses an Admin
// service is evaluated. This import MUST come before the `aggregateCounts`
// re-export below: ES module imports are hoisted and evaluated in order, and
// `aggregateCounts` calls `getFirestore()` at request time, which throws
// "The default Firebase app does not exist" unless the app is initialized.
import "./firebase";

// Community aggregate counts power the public community leaderboard. The
// `users` collection is only readable by its owner, so counts are maintained
// server-side in the read-only `waitlistCounts` collection.
export {
  onUserCommunityChanged,
  recomputeWaitlistCounts,
} from "./waitlist/aggregateCounts";

// import {onRequest} from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
//
// Region MUST match the Firestore database location (`northamerica-northeast1`
// in firebase.json). A 2nd-gen Firestore trigger is an Eventarc trigger that
// must be co-located with the database; if the function defaults to
// `us-central1` while the database lives elsewhere, the trigger is created but
// never receives events, so `waitlistCounts` is never written.
setGlobalOptions({maxInstances: 10, region: "northamerica-northeast1"});

// Non-secret config -> params (set via .env or CLI prompt at deploy)
export const esNodeUrl = defineString("ES_NODE_URL", {
  default: "https://51.161.103.215:9200",
});
export const esUsername = defineString("ES_USERNAME", {default: "elastic"});

// Secrets -> bound to Secret Manager
export const esPassword = defineSecret("ES_PASSWORD");
export const esCaCert = defineSecret("ES_CA_CERT");
export const esClientCert = defineSecret("ES_CLIENT_CERT");
export const esClientKey = defineSecret("ES_CLIENT_KEY");

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const syncSearch = onRequest(
  {secrets: [esPassword, esCaCert, esClientCert, esClientKey]},
  async (req, res) => {
    const agent = new https.Agent({
      ca: esCaCert.value(),
      cert: esClientCert.value(),
      key: esClientKey.value(),
    });
    // Placeholder: the Elasticsearch sync is not implemented yet. Reference
    // the request, response, and agent so the scaffold compiles until the
    // fetch call is added.
    void agent;
    void req;
    res.status(501).json({error: "Elasticsearch sync is not implemented yet."});
    // fetch(`${esNodeUrl.value()}/...`, { agent, ... })
  },
);
