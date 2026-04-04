import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find emails that appear in BOTH lead magnets
const [doubledip] = await conn.execute(`
  SELECT a.email, a.createdAt as estimating_date, b.createdAt as q2_date
  FROM email_subscribers a
  INNER JOIN email_subscribers b ON a.email = b.email
  WHERE a.source = 'lead_magnet_estimating-checklist'
    AND b.source = 'lead_magnet_q1-q2-framework'
  ORDER BY a.createdAt DESC
`);

console.log("=== DOUBLE-DIP LEADS (grabbed BOTH lead magnets) ===");
console.log(`Total: ${doubledip.length}\n`);
doubledip.forEach((r, i) => {
  console.log(`${i + 1}. ${r.email}`);
  console.log(`   Estimating Checklist: ${r.estimating_date}`);
  console.log(`   Q1/Q2 Framework: ${r.q2_date}`);
  console.log("");
});

// Also find triple-dippers (all 3 sources)
const [tripledip] = await conn.execute(`
  SELECT a.email
  FROM email_subscribers a
  INNER JOIN email_subscribers b ON a.email = b.email
  INNER JOIN email_subscribers c ON a.email = c.email
  WHERE a.source = 'lead_magnet_estimating-checklist'
    AND b.source = 'lead_magnet_q1-q2-framework'
    AND c.source = 'homepage_capture'
  ORDER BY a.createdAt DESC
`);

if (tripledip.length > 0) {
  console.log("=== TRIPLE-DIP LEADS (grabbed BOTH lead magnets + homepage subscribe) ===");
  console.log(`Total: ${tripledip.length}\n`);
  tripledip.forEach((r, i) => console.log(`${i + 1}. ${r.email}`));
}

// Summary stats
const [estOnly] = await conn.execute(`
  SELECT COUNT(*) as count FROM email_subscribers a
  WHERE a.source = 'lead_magnet_estimating-checklist'
    AND a.email NOT IN (SELECT email FROM email_subscribers WHERE source = 'lead_magnet_q1-q2-framework')
`);
const [q2Only] = await conn.execute(`
  SELECT COUNT(*) as count FROM email_subscribers a
  WHERE a.source = 'lead_magnet_q1-q2-framework'
    AND a.email NOT IN (SELECT email FROM email_subscribers WHERE source = 'lead_magnet_estimating-checklist')
`);

console.log("\n=== SUMMARY ===");
console.log(`Double-dip (both magnets): ${doubledip.length}`);
console.log(`Estimating Checklist only: ${estOnly[0].count}`);
console.log(`Q1/Q2 Framework only: ${q2Only[0].count}`);
console.log(`Triple-dip (both + homepage): ${tripledip.length}`);

await conn.end();
process.exit(0);
