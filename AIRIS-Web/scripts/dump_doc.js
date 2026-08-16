const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

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

if (!serviceAccountPath) {
  console.error("Service Account JSON Key file not found!");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function dumpDoc() {
  console.log("Locating student profiles...");
  const usersSnap = await db.collection("users").where("role", "==", "student").get();
  
  if (usersSnap.empty) {
    console.log("No student profiles found.");
    process.exit(0);
  }

  const studentDoc = usersSnap.docs[0];
  const studentData = studentDoc.data();
  console.log(`Student: ${studentData.fullName} (UID: ${studentDoc.id})`);
  console.log(`Active Resume ID: ${studentData.activeResumeId}`);

  if (studentData.activeResumeId) {
    const resumeRef = db
      .collection("users")
      .doc(studentDoc.id)
      .collection("resumes")
      .doc(studentData.activeResumeId);
    
    const resumeSnap = await resumeRef.get();
    if (resumeSnap.exists) {
      const resumeData = resumeSnap.data();
      console.log(`Resume Doc exists! Latest Analysis ID: ${resumeData.latestAnalysisId}`);
      
      if (resumeData.latestAnalysisId) {
        const analysisRef = db
          .collection("users")
          .doc(studentDoc.id)
          .collection("resumeAnalyses")
          .doc(resumeData.latestAnalysisId);
        
        const analysisSnap = await analysisRef.get();
        if (analysisSnap.exists) {
          console.log("\n--- Analysis Document Data ---");
          console.log(JSON.stringify(analysisSnap.data(), null, 2));
        } else {
          console.log(`Analysis doc NOT found at resumeAnalyses/${resumeData.latestAnalysisId}`);
        }
      }
    } else {
      console.log(`Resume doc NOT found at resumes/${studentData.activeResumeId}`);
    }
  }

  process.exit(0);
}

dumpDoc();
