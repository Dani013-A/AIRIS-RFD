/**
 * AIRIS Database Orphans Cleanup Script
 * 
 * This script connects to your Firebase project using a Service Account Key,
 * lists all active users in Firebase Authentication, and prunes (deletes)
 * any orphaned Firestore user profiles that do not exist in Auth.
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");
const path = require("path");

// Search parent directory and current directory for the service account json file
const searchDirs = [
  path.join(__dirname, ".."),      // AIRIS-Web root
  path.join(__dirname, "../.."),   // AIRIS parent root
];

let serviceAccountPath = null;

for (const dir of searchDirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    const keyFile = files.find((f) => f.endsWith(".json") && f.includes("firebase-adminsdk"));
    if (keyFile) {
      serviceAccountPath = path.join(dir, keyFile);
      break;
    }
  }
}

// Fallback search check for exact named file
if (!serviceAccountPath) {
  const fallbackPath = path.join(__dirname, "../service-account.json");
  if (fs.existsSync(fallbackPath)) {
    serviceAccountPath = fallbackPath;
  }
}

if (!serviceAccountPath) {
  console.log("\x1b[31m%s\x1b[0m", "Error: Service Account JSON Key file not found!");
  console.log("\nTo clean up orphaned Firestore documents, follow these steps:");
  console.log("1. Open the Firebase Console (https://console.firebase.google.com/)");
  console.log("2. Navigate to Project Settings -> Service Accounts.");
  console.log("3. Click 'Generate new private key' and download the JSON file.");
  console.log("4. Save the downloaded JSON file directly inside the AIRIS or AIRIS-Web folders.");
  console.log("\n5. Run this script again: node scripts/sync-users.js\n");
  process.exit(1);
}

console.log(`Using Service Account key found at: ${serviceAccountPath}`);
const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

async function syncAndCleanOrphans() {
  console.log("Fetching active users from Firebase Authentication...");
  const authUsers = new Set();
  
  try {
    let nextPageToken;
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      listUsersResult.users.forEach((userRecord) => {
        authUsers.add(userRecord.uid);
      });
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Found ${authUsers.size} active users in Firebase Authentication.`);

    console.log("Fetching all student profiles from Firestore 'users' collection...");
    const usersSnap = await db.collection("users").where("role", "==", "student").get();
    
    console.log(`Found ${usersSnap.size} student profile documents in Firestore.`);
    let deletedCount = 0;

    for (const doc of usersSnap.docs) {
      const uid = doc.id;
      const data = doc.data();

      // If the Firestore document UID does not exist in Auth, it's an orphan!
      if (!authUsers.has(uid)) {
        console.log(`Pruning orphan profile: ${data.fullName || "Unnamed"} (${data.email}) - UID: ${uid}`);
        
        // 1. Delete nested resumes and analyses subcollections
        const resumesSnap = await doc.ref.collection("resumes").get();
        for (const rDoc of resumesSnap.docs) {
          await rDoc.ref.delete();
        }

        const analysesSnap = await doc.ref.collection("resumeAnalyses").get();
        for (const aDoc of analysesSnap.docs) {
          await aDoc.ref.delete();
        }

        // 2. Delete the parent user document
        await doc.ref.delete();
        deletedCount++;
      }
    }

    console.log(`\n\x1b[32m%s\x1b[0m`, `Success! Successfully pruned ${deletedCount} orphaned Firestore documents.`);
    console.log("Your web dashboard numbers will now match your Authentication table exactly!");
    process.exit(0);
  } catch (error) {
    console.error("Database sync failed:", error);
    process.exit(1);
  }
}

syncAndCleanOrphans();
