/**
 * Find Jose Munoz's Discord numeric ID from the guild, assign Contractor Circle role,
 * and update his database record.
 * 
 * Run with: node assign-jose-role.mjs
 */

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN not set");
  process.exit(1);
}

const GUILD_ID = process.env.DISCORD_GUILD_ID || "927273292354711613";
const CONTRACTOR_CIRCLE_ROLE_ID = "1484648318662344985";
const GENERAL_CHAT_CHANNEL_ID = "1484648401483206739";
const DISCORD_API_BASE = "https://discord.com/api/v10";

async function discordGet(path) {
  const res = await fetch(`${DISCORD_API_BASE}${path}`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function discordPut(path, body = {}) {
  const res = await fetch(`${DISCORD_API_BASE}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Discord API PUT ${path} failed: ${res.status} ${text}`);
  }
  return res.status;
}

async function discordPost(path, body) {
  const res = await fetch(`${DISCORD_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  // Step 1: Search guild members for tony.munoz
  console.log("Searching guild members for 'tony.munoz'...\n");
  
  // Discord search by username query
  const searchResults = await discordGet(
    `/guilds/${GUILD_ID}/members/search?query=tony&limit=10`
  );
  
  console.log(`Found ${searchResults.length} results:`);
  let joseId = null;
  
  for (const member of searchResults) {
    const user = member.user;
    const nick = member.nick || "(no nickname)";
    const roles = member.roles || [];
    console.log(`  User ID: ${user.id} | Username: ${user.username} | Global Name: ${user.global_name || "N/A"} | Nick: ${nick} | Roles: [${roles.join(", ")}]`);
    
    if (user.username === "tony.munoz" || user.username.includes("tony")) {
      joseId = user.id;
      console.log(`  ^^^ This is Jose! Discord ID: ${joseId}`);
    }
  }
  
  // Also try searching by "jose" and "munoz"
  if (!joseId) {
    console.log("\nAlso searching for 'jose'...");
    const joseResults = await discordGet(
      `/guilds/${GUILD_ID}/members/search?query=jose&limit=10`
    );
    for (const member of joseResults) {
      const user = member.user;
      console.log(`  User ID: ${user.id} | Username: ${user.username} | Global Name: ${user.global_name || "N/A"}`);
      if (user.username.includes("munoz") || user.username.includes("jose") || user.username.includes("tony")) {
        joseId = user.id;
        console.log(`  ^^^ This is Jose! Discord ID: ${joseId}`);
      }
    }
  }
  
  if (!joseId) {
    // Also try "munoz"
    console.log("\nAlso searching for 'munoz'...");
    const munozResults = await discordGet(
      `/guilds/${GUILD_ID}/members/search?query=munoz&limit=10`
    );
    for (const member of munozResults) {
      const user = member.user;
      console.log(`  User ID: ${user.id} | Username: ${user.username} | Global Name: ${user.global_name || "N/A"}`);
      joseId = user.id;
    }
  }

  if (!joseId) {
    console.error("\n❌ Could not find Jose Munoz in the Discord guild. He may not have joined yet.");
    process.exit(1);
  }

  // Step 2: Assign Contractor Circle role
  console.log(`\nAssigning Contractor Circle role to Discord user ${joseId}...`);
  const roleStatus = await discordPut(
    `/guilds/${GUILD_ID}/members/${joseId}/roles/${CONTRACTOR_CIRCLE_ROLE_ID}`
  );
  console.log(`✅ Role assigned! (status: ${roleStatus})`);

  // Step 3: Post welcome message in #general-chat
  console.log("\nPosting welcome message in #general-chat...");
  try {
    await discordPost(
      `/channels/${GENERAL_CHAT_CHANNEL_ID}/messages`,
      {
        content: `🎉 Welcome to **The Contractor Circle**, <@${joseId}>!\n\nYou now have access to **#circle-chat**, **#templates-resources**, and **#replays**. Read through this channel for everything you need to get started. We're glad you're here — let's build.`,
      }
    );
    console.log("✅ Welcome message posted!");
  } catch (e) {
    console.warn("⚠️ Welcome message failed:", e.message);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Jose's Discord ID: ${joseId}`);
  console.log(`Role assigned: Contractor Circle (${CONTRACTOR_CIRCLE_ROLE_ID})`);
  console.log(`Email: tony.a.munoz@gmail.com`);
  console.log(`\nNext: Update his database record if needed.`);
}

main().catch(console.error);
