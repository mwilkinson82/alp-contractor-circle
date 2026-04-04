import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Estimating checklist leads
const [estTotal] = await conn.execute("SELECT COUNT(*) as count FROM email_subscribers WHERE source = 'lead_magnet_estimating-checklist'");
console.log("Estimating Checklist (unique verified emails):", estTotal[0].count);

const [estLeads] = await conn.execute("SELECT COUNT(*) as count FROM leads WHERE source = 'estimating-checklist'");
console.log("Estimating Checklist (total form submissions):", estLeads[0].count);

// All sources breakdown
const [allSources] = await conn.execute("SELECT source, COUNT(*) as count FROM email_subscribers GROUP BY source ORDER BY count DESC");
console.log("\nAll lead sources (unique verified):");
allSources.forEach(r => console.log(`  ${r.source}: ${r.count}`));

// Grand total
const [grandTotal] = await conn.execute("SELECT COUNT(*) as count FROM email_subscribers");
console.log("\nGrand total unique subscribers:", grandTotal[0].count);

// Latest 10 estimating checklist opt-ins
const [latest] = await conn.execute("SELECT email, createdAt FROM email_subscribers WHERE source = 'lead_magnet_estimating-checklist' ORDER BY createdAt DESC LIMIT 10");
console.log("\nLatest 10 Estimating Checklist opt-ins:");
latest.forEach((r, i) => console.log(`  ${i + 1}. ${r.email} | ${r.createdAt}`));

await conn.end();
process.exit(0);
