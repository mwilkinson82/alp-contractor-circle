import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);
// Get all descriptions in the DB for member 30001
const [dbEntries] = await conn.execute("SELECT description FROM user_cost_library WHERE memberId = 30001");
const dbDescs = new Set(dbEntries.map(e => e.description.toLowerCase().trim()));
console.log("DB entries:", dbDescs.size);

// Load cost table and check how many would be new
const { COST_TABLE } = await import("./shared/costTable.ts");
console.log("COST_TABLE entries:", COST_TABLE.length);

let newCount = 0;
let matchCount = 0;
for (const e of COST_TABLE) {
  if (dbDescs.has(e.description.toLowerCase().trim())) {
    matchCount++;
  } else {
    newCount++;
    if (newCount <= 5) console.log("NEW:", e.description);
  }
}
console.log("Already in DB (matched):", matchCount);
console.log("Would be added (new):", newCount);
await conn.end();
