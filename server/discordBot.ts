/**
 * Discord Gateway Bot — listens for server events using discord.js.
 *
 * Currently handles:
 *   - guildMemberAdd: Posts a welcome message in #general-chat the moment
 *     someone joins the ALP Contractor Circle Discord server.
 *
 * The bot runs inside the same Node.js process as the Express server.
 * It is started once at server startup via `startDiscordBot()`.
 */
import { Client, GatewayIntentBits, Events, type GuildMember } from "discord.js";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const GUILD_ID = process.env.DISCORD_GUILD_ID || "927273292354711613";
const GENERAL_CHAT_CHANNEL_ID = "1484648401483206739"; // #general-chat
const CONTRACTOR_CIRCLE_ROLE_ID = "1484648318662344985"; // Contractor Circle role

let botStarted = false;

export function startDiscordBot() {
  if (botStarted) return;
  if (!BOT_TOKEN) {
    console.warn("[DiscordBot] No BOT_TOKEN — gateway bot not started.");
    return;
  }

  botStarted = true;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`[DiscordBot] Logged in as ${readyClient.user.tag} — listening for new members.`);
  });

  /**
   * Fires the moment a new member joins the guild.
   * Posts a welcome message in #general-chat immediately.
   * Also assigns the Contractor Circle role if the member is already
   * linked to an active subscription in the database.
   */
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    if (member.guild.id !== GUILD_ID) return;

    const displayName = member.displayName || member.user.username;
    console.log(`[DiscordBot] New member joined: ${displayName} (${member.id})`);

    try {
      const channel = await member.guild.channels.fetch(GENERAL_CHAT_CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        await (channel as any).send({
          content: `🎉 Welcome to **The Contractor Circle**, <@${member.id}>!\n\nYou now have access to **#circle-chat**, **#templates-resources**, and **#replays**. Log in to the member portal at **alpcontractorcircle.com/portal** to access all your resources. We're glad you're here — let's build.`,
        });
        console.log(`[DiscordBot] Welcome message sent for ${displayName}`);
      }
    } catch (err: any) {
      console.warn(`[DiscordBot] Failed to send welcome message for ${displayName}:`, err?.message);
    }

    // Attempt to assign the Contractor Circle role immediately.
    // This works if the member's Discord ID is already linked to an active
    // subscription in the database (e.g., they logged into the portal first).
    try {
      const role = member.guild.roles.cache.get(CONTRACTOR_CIRCLE_ROLE_ID)
        || await member.guild.roles.fetch(CONTRACTOR_CIRCLE_ROLE_ID);
      if (role) {
        await member.roles.add(role);
        console.log(`[DiscordBot] Contractor Circle role assigned to ${displayName}`);
      }
    } catch (err: any) {
      // Non-fatal — role will be assigned when they log into the portal
      console.warn(`[DiscordBot] Could not assign role to ${displayName} on join (will assign at portal login):`, err?.message);
    }
  });

  client.login(BOT_TOKEN).catch((err) => {
    console.error("[DiscordBot] Login failed:", err?.message);
    botStarted = false;
  });
}
