import { sql } from "drizzle-orm";
import { getDb } from "../server/db.ts";

const db = await getDb();
if (!db) {
  console.error("Failed to connect to database");
  process.exit(1);
}

await db.execute(sql`CREATE TABLE IF NOT EXISTS \`user_activity_log\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`memberId\` int NOT NULL,
  \`displayName\` varchar(256),
  \`action\` varchar(128) NOT NULL,
  \`description\` varchar(512) NOT NULL,
  \`refPath\` varchar(512),
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`user_activity_log_id\` PRIMARY KEY(\`id\`)
)`);
console.log("✅ user_activity_log table created successfully");
process.exit(0);
