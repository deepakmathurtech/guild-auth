/**
 * fixParticipations.js - Run with: node scripts/fixParticipations.js
 *
 * Fixes quest participation records where members submitted but status wasn't updated to completed.
 * Uses Firebase Admin SDK.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, collection, getDocs, query, where, doc, updateDoc } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load service account - use your actual serviceAccountKey.json
const serviceAccount = require('../serviceAccountKey.json'); // YOU NEED THIS FILE

async function fixParticipations() {
  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  console.log("🔍 Scanning Firestore...\n");

  // 1. Get all quests in progress/completed
  const questsQuery = query(
    collection(db, 'quests'),
    where('status', 'in', ['inProgress', 'completed', 'underReview'])
  );

  const questSnap = await getDocs(questsQuery);
  console.log(`Found ${questSnap.docs.length} quests`);

  let totalFixed = 0;

  for (const questDoc of questSnap.docs) {
    const quest = questDoc.data();
    const questId = questDoc.id;

    // 2. Get approved submissions for this quest
    const subsQuery = query(
      collection(db, 'questSubmissions'),
      where('questId', '==', questId),
      where('status', '==', 'approved')
    );

    const subSnap = await getDocs(subsQuery);

    for (const subDoc of subSnap.docs) {
      const submission = subDoc.data();
      const memberId = submission.memberId;

      // 3. Find and fix participation record
      const partsQuery = query(
        collection(db, 'questParticipations'),
        where('questId', '==', questId),
        where('userId', '==', memberId)
      );

      const partsSnap = await getDocs(partsQuery);

      for (const partDoc of partsSnap.docs) {
        const part = partDoc.data();

        if (part.status !== 'completed') {
          console.log(`✓ Fixing: ${quest.title} - ${memberId.slice(0,8)}... (${part.status} → completed)`);

          await updateDoc(doc(db, 'questParticipations', partDoc.id), {
            status: 'completed',
            completedAt: submission.reviewedAt || new Date().toISOString()
          });

          totalFixed++;
        }
      }
    }
  }

  console.log(`\n✅ Fixed ${totalFixed} participation records`);
  process.exit(0);
}

fixParticipations().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});