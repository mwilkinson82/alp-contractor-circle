import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// Find stuck projects
const stuck = await db.execute(sql`
  SELECT id, name, status 
  FROM takeoff_projects 
  WHERE status IN ('post_processing', 'processing')
`);

console.log("Stuck projects:", stuck[0]);

if (stuck[0] && stuck[0].length > 0) {
  const result = await db.execute(sql`
    UPDATE takeoff_projects 
    SET status = 'completed' 
    WHERE status IN ('post_processing', 'processing')
  `);
  console.log("Reset result:", result[0]);
  console.log("✓ All stuck projects reset to 'completed'");
} else {
  console.log("No stuck projects found");
}

process.exit(0);
