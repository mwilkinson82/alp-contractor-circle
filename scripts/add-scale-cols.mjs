import { getDb } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function run() {
  const db = await getDb();
  if (!db) { console.error('No DB'); process.exit(1); }
  
  try {
    await db.execute(sql`ALTER TABLE members ADD COLUMN lastScaleIdx int DEFAULT 0`);
    console.log('Added lastScaleIdx');
  } catch (e) {
    if (e.message?.includes('Duplicate column')) console.log('lastScaleIdx already exists');
    else throw e;
  }
  
  try {
    await db.execute(sql`ALTER TABLE members ADD COLUMN lastPaperIdx int DEFAULT 0`);
    console.log('Added lastPaperIdx');
  } catch (e) {
    if (e.message?.includes('Duplicate column')) console.log('lastPaperIdx already exists');
    else throw e;
  }
  
  console.log('Done');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
