import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [cols] = await conn.execute("SHOW COLUMNS FROM user_cost_library");
console.log("Columns:", cols.map(c => c.Field));
const [total] = await conn.execute("SELECT memberId, COUNT(*) as cnt FROM user_cost_library GROUP BY memberId");
console.log("All members cost library counts:", JSON.stringify(total));
await conn.end();
