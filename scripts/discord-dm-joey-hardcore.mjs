import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages] });

const GUILD_ID = "927273292354711613";
const TARGET_USER_ID = "joey_15201"; // Discord username

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
      console.log(`\nSearching for similar usernames...`);
      for (const [, member] of members) {
        if (member.user.username.toLowerCase().includes("joey")) {
          console.log(`  - ${member.user.username} (display: ${member.displayName})`);
        }
      }
      process.exit(1);
    }

    console.log(`✅ Found member: ${targetMember.user.username} (${targetMember.displayName})`);

    // Compose the DM message
    const dmMessage = `Hey Joey,

Thanks for your interest in Power Hour! Here's what you should know about the **ALP Hardcore program**:

**What's Included:**
• **Power Hour** — Daily call, Monday–Friday at 8am Eastern
• **Contractor School** — Tuesday at 7pm EST
• **Sales & Marketing School** — Wednesday at 7pm EST
• **10 one-on-ones per year** with Marshall
• Full Discord access to all channels
• Contractor Circle portal access
• Complete template library

**The Details:**
ALP Hardcore is a separate program from Contractor Circle, but it includes full Contractor Circle access as part of the package. It's designed for contractors who want deeper engagement and direct access to Marshall's coaching.

**Investment:**
$497/month (same as Contractor Circle since it's included)

**Next Steps:**
If you're interested in upgrading to ALP Hardcore, just reach out to Marshall directly and he'll get you set up with all the details and access.

Looking forward to having you in Power Hour!`;

    // Send the DM
    console.log(`\nSending DM to ${targetMember.displayName}...`);
    const dmChannel = await targetMember.createDM();
    const sentMessage = await dmChannel.send(dmMessage);
    console.log(`✅ DM sent successfully! (Message ID: ${sentMessage.id})`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
