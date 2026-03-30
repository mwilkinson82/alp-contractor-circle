import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const GUILD_ID = "927273292354711613";
const TARGET_USER_NAME = "danbillingsley";
const TARGET_ROLE_NAME = "Contractor Circle";

client.on("ready", async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);

  try {
    // Fetch the guild
    const guild = await client.guilds.fetch(GUILD_ID);
    console.log(`✅ Guild fetched: ${guild.name}`);

    // Fetch all members
    console.log(`Fetching members...`);
    const members = await guild.members.fetch();
    console.log(`✅ Fetched ${members.size} members`);

    // Search for Dan Billingsley
    let targetMember = null;
    for (const [, member] of members) {
      if (
        member.user.username === TARGET_USER_NAME ||
        member.displayName === TARGET_USER_NAME ||
        member.user.globalName === TARGET_USER_NAME
      ) {
        targetMember = member;
        break;
      }
    }

    if (!targetMember) {
      console.error(`❌ Could not find member: ${TARGET_USER_NAME}`);
      console.log(`\nSearching for similar names...`);
      for (const [, member] of members) {
        if (
          member.user.username.toLowerCase().includes("dan") ||
          member.displayName.toLowerCase().includes("dan") ||
          member.user.globalName?.toLowerCase().includes("dan")
        ) {
          console.log(
            `  - ${member.user.username} (display: ${member.displayName}, global: ${member.user.globalName})`
          );
        }
      }
      process.exit(1);
    }

    console.log(`✅ Found member: ${targetMember.user.username} (${targetMember.displayName})`);

    // Fetch all roles
    const roles = await guild.roles.fetch();
    console.log(`✅ Fetched ${roles.size} roles`);

    // Search for Contractor Circle role
    let targetRole = null;
    for (const [, role] of roles) {
      if (role.name === TARGET_ROLE_NAME) {
        targetRole = role;
        break;
      }
    }

    if (!targetRole) {
      console.error(`❌ Could not find role: ${TARGET_ROLE_NAME}`);
      console.log(`\nAvailable roles:`);
      for (const [, role] of roles) {
        if (!role.managed) {
          console.log(`  - ${role.name} (ID: ${role.id})`);
        }
      }
      process.exit(1);
    }

    console.log(`✅ Found role: ${targetRole.name} (ID: ${targetRole.id})`);

    // Check if member already has the role
    if (targetMember.roles.cache.has(targetRole.id)) {
      console.log(`⚠️  Member already has the ${TARGET_ROLE_NAME} role`);
      process.exit(0);
    }

    // Assign the role
    console.log(`Assigning ${TARGET_ROLE_NAME} to ${targetMember.displayName}...`);
    await targetMember.roles.add(targetRole);
    console.log(`✅ Successfully assigned ${TARGET_ROLE_NAME} to ${targetMember.displayName}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
