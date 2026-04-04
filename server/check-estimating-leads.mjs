import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get total count of estimating-checklist leads
const [totalRows] = await conn.execute("SELECT COUNT(*) as count FROM email_subscribers WHERE source = 'lead_magnet_estimating-checklist'");
console.log("Total estimating-checklist leads:", totalRows[0].count);

// Get all leads with details
const [leads] = await conn.execute("SELECT * FROM email_subscribers WHERE source = 'lead_magnet_estimating-checklist' ORDER BY createdAt DESC");
console.log("\nAll estimating-checklist leads:");
leads.forEach((r, i) => console.log(`${i + 1}. ${r.email} | Source: ${r.source} | Verified: ${r.verified} | Date: ${r.createdAt}`));

// Check all sources to see the full picture
const [allSources] = await conn.execute("SELECT source, COUNT(*) as count FROM email_subscribers GROUP BY source ORDER BY count DESC");
console.log("\nAll lead sources:");
allSources.forEach(r => console.log(`  ${r.source}: ${r.count}`));

// Total across all sources
const [grandTotal] = await conn.execute("SELECT COUNT(*) as count FROM email_subscribers");
console.log("\nGrand total subscribers:", grandTotal[0].count);

// Also check the leads table
const [leadsTable] = await conn.execute("SELECT COUNT(*) as count FROM leads WHERE source = 'estimating-checklist'").catch(() => [[{count: 'N/A - table may not exist'}]]);
console.log("\nLeads table (estimating-checklist):", leadsTable[0].count);

await conn.end();
process.exit(0);
