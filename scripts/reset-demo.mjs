// Restores the public demo account (demo@ledgenator.app / demo1234) to the
// sample data in demo-seed.json, wiping whatever visitors changed.
//
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-sa.json npm run reset-demo
//
// The shared ticker catalog (apps/ledgenator/assets) is left alone; the seed's
// operations point at assets that already exist there.
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const DEMO_EMAIL = 'demo@ledgenator.app';
const DEMO_PASSWORD = 'demo1234';

initializeApp({ projectId: 'erickmob-apps' });
const auth = getAuth();
const db = getFirestore();

const seed = JSON.parse(readFileSync(new URL('./demo-seed.json', import.meta.url), 'utf8'));
const demo = await auth.getUserByEmail(DEMO_EMAIL);

// The claim keeps the demo away from paid APIs and from shared data.
await auth.updateUser(demo.uid, { password: DEMO_PASSWORD });
await auth.setCustomUserClaims(demo.uid, { demo: true });

const userRef = db.doc(`apps/ledgenator/users/${demo.uid}`);
for (const [collection, docs] of Object.entries(seed)) {
  const existing = await userRef.collection(collection).listDocuments();
  const batch = db.batch();
  existing.forEach((ref) => batch.delete(ref));
  for (const [id, data] of Object.entries(docs)) {
    batch.set(userRef.collection(collection).doc(id), { ...data, ...(data.user_id ? { user_id: demo.uid } : {}) });
  }
  await batch.commit();
  console.log(`${collection}: ${Object.keys(docs).length}`);
}
