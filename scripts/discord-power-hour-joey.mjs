import "dotenv/config";
import { Client, GatewayIntentBits, ChannelType } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const GUILD_ID = "927273292354711613";
const TARGET_USER_NAME = "Joey D";
const CHANNEL_NAME = "general-chat";

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

    // Search for Joey D
    let targetMember = null;
    for (const [, member] of members) {
      if (
        member.displayName.toLowerCase().includes("joey") ||
        member.user.username.toLowerCase().includes("joey") ||
        member.user.globalName?.toLowerCase().includes("joey")
      ) {
        targetMember = member;
        console.log(
          `Found potential match: ${member.user.username} (display: ${member.displayName}, global: ${member.user.globalName})`
        );
        break;
      }
    }

    if (!targetMember) {
      console.error(`❌ Could not find member matching: ${TARGET_USER_NAME}`);
      console.log(`\nSearching for all members with "joey" in their name...`);
      for (const [, member] of members) {
        const displayLower = member.displayName.toLowerCase();
        const usernameLower = member.user.username.toLowerCase();
        const globalLower = member.user.globalName?.toLowerCase() || "";
        if (displayLower.includes("joey") || usernameLower.includes("joey") || globalLower.includes("joey")) {
          console.log(
            `  - ${member.user.username} (display: ${member.displayName}, global: ${member.user.globalName})`
          );
        }
      }
      process.exit(1);
    }

    console.log(`✅ Found member: ${targetMember.user.username} (${targetMember.displayName})`);

    // Find the general-chat channel
    const channels = await guild.channels.fetch();
    let targetChannel = null;
    for (const [, channel] of channels) {
      if (channel.type === ChannelType.GuildText && channel.name === CHANNEL_NAME) {
        targetChannel = channel;
        break;
      }
    }

    if (!targetChannel) {
      console.error(`❌ Could not find ${CHANNEL_NAME} channel`);
      process.exit(1);
    }

    console.log(`✅ Found channel: ${targetChannel.name}`);

    // Compose the Power Hour message
    const powerHourMessage = `Hey ${targetMember} — just to add to what Marshall said, Power Hour is a daily call Monday–Friday at 8am ET as part of the ALP Hardcore program. If you're interested in getting access, just let us know and we'll get you the details.`;

    // Post the message
    console.log(`\nPosting Power Hour message...`);
    const sentMessage = await targetChannel.send(powerHourMessage);
    console.log(`✅ Message posted! (Message ID: ${sentMessage.id})`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
