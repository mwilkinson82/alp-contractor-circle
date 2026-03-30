import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages] });

const GUILD_ID = "927273292354711613";
const TARGET_USER_ID = "joey_15201";
const MESSAGE_ID = "1488181626696372436";

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

    // Search for Joey D by username
    let targetMember = null;
    for (const [, member] of members) {
      if (member.user.username === TARGET_USER_ID) {
        targetMember = member;
        break;
      }
    }

    if (!targetMember) {
      console.error(`❌ Could not find member with username: ${TARGET_USER_ID}`);
      process.exit(1);
    }

    console.log(`✅ Found member: ${targetMember.user.username} (${targetMember.displayName})`);

    // Open DM channel
    console.log(`\nOpening DM channel...`);
    const dmChannel = await targetMember.createDM();
    console.log(`✅ DM channel opened`);

    // Fetch the message
    console.log(`\nFetching message ID: ${MESSAGE_ID}...`);
    const message = await dmChannel.messages.fetch(MESSAGE_ID);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`MESSAGE CONTENT:`);
    console.log(`${'='.repeat(80)}\n`);
    console.log(message.content);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\nMessage Details:`);
    console.log(`  Author: ${message.author.username}`);
    console.log(`  Created: ${message.createdAt.toISOString()}`);
    console.log(`  Message ID: ${message.id}`);
    console.log(`  Channel: DM with ${targetMember.displayName}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
