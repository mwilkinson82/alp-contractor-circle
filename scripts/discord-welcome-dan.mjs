import "dotenv/config";
import { Client, GatewayIntentBits, ChannelType } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const GUILD_ID = "927273292354711613";
const TARGET_USER_NAME = "danbillingsley";

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
      if (member.user.username.toLowerCase() === TARGET_USER_NAME.toLowerCase()) {
        targetMember = member;
        break;
      }
    }

    if (!targetMember) {
      console.error(`❌ Could not find member: ${TARGET_USER_NAME}`);
      process.exit(1);
    }

    console.log(`✅ Found member: ${targetMember.user.username}`);

    // Find the general channel
    const channels = await guild.channels.fetch();
    let generalChannel = null;
    for (const [, channel] of channels) {
      if (channel.type === ChannelType.GuildText && channel.name === "general-chat") {
        generalChannel = channel;
        break;
      }
    }

    if (!generalChannel) {
      console.error(`❌ Could not find general channel`);
      console.log(`\nAvailable text channels:`);
      for (const [, channel] of channels) {
        if (channel.type === ChannelType.GuildText) {
          console.log(`  - ${channel.name} (ID: ${channel.id})`);
        }
      }
      process.exit(1);
    }

    console.log(`✅ Found general channel: ${generalChannel.name}`);

    // Compose the welcome message
    const welcomeMessage = `Welcome to the Contractor Circle, ${targetMember}! 🎉

We're excited to have you here. You've been assigned the **Contractor Circle** role and now have access to all exclusive Contractor Circle threads and resources.

Feel free to introduce yourself, ask questions, and connect with the community. Looking forward to collaborating with you!`;

    // Post the message
    console.log(`\nPosting welcome message...`);
    const sentMessage = await generalChannel.send(welcomeMessage);
    console.log(`✅ Welcome message posted! (Message ID: ${sentMessage.id})`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
