import { sendDiscordInviteEmail } from "./server/email.ts";
async function main() {
  console.log("Sending Discord invite preview to marshall@marshallwilkinson.com...");
  const result = await sendDiscordInviteEmail({
    to: "marshall@marshallwilkinson.com",
    name: "Jake Huffman",
  });
  console.log("Result:", JSON.stringify(result, null, 2));
}
main().catch(console.error);
