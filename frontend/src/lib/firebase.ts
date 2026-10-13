import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

import { firebaseConfig, useFirebaseEmulators } from "./env";

/**
 * Firebase client SDK singleton.
 *
 * Initialization is lazy and idempotent so it is safe to import from any
 * client component without creating duplicate apps during hot reload.
 */

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (useFirebaseEmulators) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    }
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    if (useFirebaseEmulators) {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
    if (useFirebaseEmulators) {
      connectStorageEmulator(storage, "127.0.0.1", 9199);
    }
  }
  return storage;
}

export { getFirebaseApp };
