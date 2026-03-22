// read-fix-queue.mjs — Reads uncompleted "App Fixes" reminders from Firestore
// Usage: cd ~/figgg && node scripts/read-fix-queue.mjs
// Output: JSON to stdout

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');
const path = require('path');
const { readFileSync } = require('fs');

const serviceAccount = JSON.parse(
  readFileSync(new URL('../service-account.json', import.meta.url), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'figgg-c2c8f'
});

const db = admin.firestore();
const USER_ID = 'jqM85HqQFBd0U7G9AFWk3RRUj2P2';
const FIX_LIST_ID = 'app-fixes';

async function main() {
  const selfCareDoc = await db.doc(`users/${USER_ID}/singletons/selfCare`).get();
  if (!selfCareDoc.exists) {
    console.log(JSON.stringify({ items: [], count: 0, error: 'selfCare doc not found' }));
    process.exit(0);
  }

  const data = selfCareDoc.data();
  const reminders = data.reminders || [];

  const fixItems = reminders.filter(r =>
    r.listId === FIX_LIST_ID && !r.completed
  );

  console.log(JSON.stringify({
    items: fixItems.map(r => ({
      id: r.id,
      title: r.title,
      notes: r.notes || '',
      priority: r.priority,
      flagged: r.flagged,
      dueDate: r.dueDate || null,
      createdAt: r.createdAt
    })),
    count: fixItems.length,
    checkedAt: new Date().toISOString()
  }));

  process.exit(0);
}

main().catch(e => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
