import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { INDIAN_STATES } from './jurisdiction';

/**
 * migrateToFederationV3
 * 
 * One-time migration to backfill jurisdiction data for existing records.
 */
export async function migrateToFederationV3() {
  const collections = ['users', 'organizations', 'needs', 'opportunities', 'quests', 'outcomes', 'verifications', 'revenueEvents', 'knowledgeBase'];
  
  // 1. Seed States
  const stateBatch = writeBatch(db);
  INDIAN_STATES.forEach(state => {
    const ref = doc(db, 'guildStates', state.id);
    stateBatch.set(ref, {
      ...state,
      countryId: 'india',
      countryName: 'India',
      createdAt: new Date().toISOString()
    });
  });
  await stateBatch.commit();
  console.log('Seeded States');

  // 2. Backfill Records
  for (const col of collections) {
    const snap = await getDocs(collection(db, col));
    const batch = writeBatch(db);
    let count = 0;

    snap.docs.forEach(d => {
      const data = d.data();
      if (!data.jurisdiction) {
        batch.update(d.ref, {
          jurisdiction: {
            countryId: 'india',
            countryName: 'India',
            stateId: 'pb', // Default to Punjab for existing data
            stateName: 'Punjab',
            cityId: 'ldh',
            cityName: 'Ludhiana'
          }
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Backfilled ${count} records in ${col}`);
    }
  }
}
