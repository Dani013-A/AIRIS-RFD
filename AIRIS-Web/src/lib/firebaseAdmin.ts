import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

function resolveAdminCredentials() {
  // 1. Explicit environment variable with JSON string or file path
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      if (fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) {
        return cert(JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "utf8")));
      }
      return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", msg);
    }
  }

  // 2. Google standard credentials path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      return cert(JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[FirebaseAdmin] Failed to load GOOGLE_APPLICATION_CREDENTIALS:", msg);
    }
  }

  // 3. Known EC2 production secret location
  const ec2SecretPath = "/opt/airis/secrets/firebase-service-account.json";
  if (fs.existsSync(ec2SecretPath)) {
    try {
      return cert(JSON.parse(fs.readFileSync(ec2SecretPath, "utf8")));
    } catch {
      // Continue to next fallback
    }
  }

  return undefined;
}

export function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const credential = resolveAdminCredentials();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "airis-development";

  if (credential) {
    return initializeApp({
      credential,
      projectId,
    });
  }

  return initializeApp({
    projectId,
  });
}

export const adminApp = getFirebaseAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
