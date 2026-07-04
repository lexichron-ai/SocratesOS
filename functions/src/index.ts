/**
 * Firebase Cloud Functions entry point for SocratesOS.
 *
 * Exports all HTTP and background functions consumed by Firebase.
 */

import * as admin from "firebase-admin";

// Initialise the Firebase Admin SDK once at cold-start.
admin.initializeApp();

export { analyzeDqs } from "./api/dqs";
