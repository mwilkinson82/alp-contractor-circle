import { Client, GatewayIntentBits } from "discord.js";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GENERAL_CHAT_ID = "1484648401483206739";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(GENERAL_CHAT_ID);

    await channel.send({
      content: `📋 **New Template — ALP/EOS Vision/Traction Organizer (V/TO)**

The V/TO just dropped in the template library. This is the two-page document that captures your company's entire strategic plan — Vision on page one, Traction on page two.

Covers all 8 questions: Core Values, Core Focus, 10-Year Target, Marketing Strategy, 3-Year Picture, 1-Year Plan, Quarterly Rocks, and Issues List. Includes a completed example for a mid-size GC so you can see exactly what a finished one looks like.

Log in to the portal → **Templates → Operations** to download it.
🔗 https://alpcontractorcircle.com/portal/templates`,
    });

    console.log("Message posted in #general-chat");
  } catch (err) {
    console.error("Failed to post:", err.message);
  }

  client.destroy();
  process.exit(0);
});

client.login(BOT_TOKEN);
