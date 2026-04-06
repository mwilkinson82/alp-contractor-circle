/**
 * Update Jose Munoz's database record with his Discord ID.
 * Run with: node update-jose-db.mjs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const JOSE_DISCORD_ID = "1490703577251840112";
const JOSE_USERNAME = "tony.munoz";
const JOSE_DISPLAY_NAME = "Tony Muñoz";
const JOSE_EMAIL = "tony.a.munoz@gmail.com";

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log("Checking for existing records...\n");
  
  const [byEmail] = await connection.execute(
    "SELECT * FROM members WHERE email = ? OR email LIKE '%munoz%' OR discordId = ? OR discordId = ?",
    [JOSE_EMAIL, JOSE_DISCORD_ID, `email:${JOSE_EMAIL}`]
  );

  if (byEmail.length > 0) {
    console.log("Found existing record(s):");
    for (const row of byEmail) {
      console.log(`  ID: ${row.id} | Discord: ${row.discordId} | User: ${row.discordUsername} | Name: ${row.discordDisplayName} | Email: ${row.email} | Sub: ${row.subscriptionStatus} | Role: ${row.memberRole} | Stripe: ${row.stripeCustomerId}`);
    }

    const placeholder = byEmail.find(r => r.discordId && r.discordId.startsWith("email:"));
    if (placeholder) {
      console.log(`\nMerging placeholder record (id=${placeholder.id}) with Discord identity...`);
      await connection.execute(
        "UPDATE members SET discordId = ?, discordUsername = ?, discordDisplayName = ?, email = ?, lastSignedIn = NOW() WHERE id = ?",
        [JOSE_DISCORD_ID, JOSE_USERNAME, JOSE_DISPLAY_NAME, JOSE_EMAIL, placeholder.id]
      );
      console.log("✅ Record merged with Discord identity!");
    } else if (byEmail.find(r => r.discordId === JOSE_DISCORD_ID)) {
      console.log("\n✅ Record already has correct Discord ID. No update needed.");
    } else {
      const existing = byEmail[0];
      console.log(`\nUpdating record (id=${existing.id}) with Discord identity...`);
      await connection.execute(
        "UPDATE members SET discordId = ?, discordUsername = ?, discordDisplayName = ?, lastSignedIn = NOW() WHERE id = ?",
        [JOSE_DISCORD_ID, JOSE_USERNAME, JOSE_DISPLAY_NAME, existing.id]
      );
      console.log("✅ Record updated with Discord identity!");
    }
  } else {
    console.log("No existing record found. Creating new member record...");
    await connection.execute(
      "INSERT INTO members (discordId, discordUsername, discordDisplayName, email, subscriptionStatus, memberRole, lastSignedIn) VALUES (?, ?, ?, ?, 'active', 'member', NOW())",
      [JOSE_DISCORD_ID, JOSE_USERNAME, JOSE_DISPLAY_NAME, JOSE_EMAIL]
    );
    console.log("✅ New member record created!");
  }

  // Verify final state
  const [final] = await connection.execute(
    "SELECT * FROM members WHERE discordId = ? OR email = ?",
    [JOSE_DISCORD_ID, JOSE_EMAIL]
  );
  
  console.log("\nFinal record:");
  for (const row of final) {
    console.log(`  ID: ${row.id} | Discord: ${row.discordId} | User: ${row.discordUsername} | Name: ${row.discordDisplayName} | Email: ${row.email} | Sub: ${row.subscriptionStatus} | Role: ${row.memberRole} | Stripe: ${row.stripeCustomerId}`);
  }

  const [count] = await connection.execute("SELECT COUNT(*) as total FROM members WHERE subscriptionStatus = 'active'");
  console.log(`\nTotal active members: ${count[0].total}`);

  await connection.end();
}

main().catch(console.error);
