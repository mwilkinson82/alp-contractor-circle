import { Client, GatewayIntentBits } from "discord.js";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GENERAL_CHAT_ID = "1484648401483206739";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    const channel = await client.channels.fetch(GENERAL_CHAT_ID);
    await channel.send(`Good morning, power hour starts in four minutes. With Bryan, today is another day to be excellent, to be great, don't take a back step.`);
    console.log("Message posted in #general-chat");
  } catch (err) {
    console.error("Failed to post:", err.message);
  }
  client.destroy();
  process.exit(0);
});

client.login(BOT_TOKEN);
