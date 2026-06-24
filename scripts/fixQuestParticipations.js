/**
 * fixQuestParticipations.js
 *
 * Fixes quest participation records where acceptance/submission status wasn't properly synced.
 * Run with: node scripts/fixQuestParticipations.js
 *
 * NOTE: First set your Firebase credentials in .env or update the config below.
 */

const { initializeApp } = require('firebase/data-types');
const { getFirestore, collection, getDocs, query, where, doc, updateDoc } = require('firebase/firestore');

// === CONFIG: Update these for your Firebase project ===
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ========================================================

async function fixQuestParticipations() {
  const fs = require('fs');
  const path = require('path');

  // Try to load config from .env.local if exists
  const envPath = path.join(__dirname, '..', '.env.local');
  let config = { ...firebaseConfig };

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^VITE_(.*)=(.*)$/);
      if (match) {
        const key = match[1];
        const value = match[2].trim();
        if (key === 'FIREBASE_API_KEY') config.apiKey = value;
        if (key === 'FIREBASE_AUTH_DOMAIN') config.authDomain = value;
        if (key === 'FIREBASE_PROJECT_ID') config.projectId = value;
        if (key === 'FIREBASE_STORAGE_BUCKET') config.storageBucket = value;
        if (key === 'FIREBASE_MESSAGING_SENDER_ID') config.messagingSenderId = value;
        if (key === 'FIREBASE_APP_ID') config.appId = value;
      }
    });
  }

  if (config.apiKey === "YOUR_API_KEY") {
    console.error("❌ Please configure Firebase config in this script or set .env.local");
    process.exit(1);
  }

  const { getFirestore, collection, getDocs, query, where, doc, updateDoc } = require('firebase/firestore');
  const { initializeApp } = require('firebase/app');

  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log("🔍 Scanning quest records...\n");

  // 1. Get all quests that are inProgress or completed
  const questsQuery = query(
    collection(db, 'quests'),
    where('status', 'in', ['inProgress', 'completed', 'underReview'])
  );

  const questSnap = await getDocs(questsQuery);
  console.log(`Found ${questSnap.docs.length} quests in progress/completed`);

  let fixedCount = 0;

  for (const questDoc of questSnap.docs) {
    const quest = questDoc.data();
    const questId = questDoc.id;

    console.log(`\n📋 Processing Quest: ${quest.title || questId}`);

    // 2. Get all submissions for this quest
    const submissionsQuery = query(
      collection(db, 'questSubmissions'),
      where('questId', '==', questId),
      where('status', '==', 'approved')
    );

    const subSnap = await getDocs(submissionsQuery);
    console.log(`  → Found ${subSnap.docs.length} approved submissions`);

    // 3. Find participations that need to be marked as completed
    for (const subDoc of subSnap.docs) {
      const submission = subDoc.data();
      const memberId = submission.memberId;

      // Find participation record
      const partsQuery = query(
        collection(db, 'questParticipations'),
        where('questId', '==', questId),
        where('userId', '==', memberId)
      );

      const partsSnap = await getDocs(partsQuery);

      for (const partDoc of partsSnap.docs) {
        const part = partDoc.data();

        if (part.status !== 'completed') {
          console.log(`  ✓ Fixing participation for ${memberId}: ${part.status} → completed`);

          await updateDoc(doc(db, 'questParticipations', partDoc.id), {
            status: 'completed',
            completedAt: submission.reviewedAt || new Date().toISOString()
          });

          fixedCount++;
        }
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} participation records`);

  // Also check for any participations where member submitted but status not completed
  console.log("\n🔍 Additional check: participations with submittedAt but not completed...\n");

  const allPartsQuery = query(
    collection(db, 'questParticipations'),
    where('status', '!=', 'completed')
  );

  const allPartsSnap = await getDocs(allPartsQuery);
  let additionalFixed = 0;

  for (const partDoc of allPartsSnap.docs) {
    const part = partDoc.data();

    // If has submittedAt but not completed, fix it
    if (part.submittedAt && part.status !== 'completed') {
      console.log(`  ✓ Fixing: ${part.questId} for ${part.userId}: ${part.status} → completed`);

      await updateDoc(doc(db, 'questParticipations', partDoc.id), {
        status: 'completed',
        completedAt: part.submittedAt
      });

      additionalFixed++;
    }
  }

  if (additionalFixed > 0) {
    console.log(`\n✅ Fixed additional ${additionalFixed} records`);
  } else {
    console.log("No additional records to fix");
  }

  console.log(`\n🎉 Total fixed: ${fixedCount + additionalFixed} participation records`);
}

fixQuestParticipations().catch(console.error);