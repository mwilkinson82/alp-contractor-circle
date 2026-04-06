import { sendDiscordInviteEmail } from "./server/email.ts";
async function main() {
  console.log("Sending Discord invite to Jake Huffman (jhuffman@huffmancc.com)...");
  const result = await sendDiscordInviteEmail({
    to: "jhuffman@huffmancc.com",
    name: "Jake Huffman",
  });
  console.log("Result:", JSON.stringify(result, null, 2));
  if (result.success) {
    console.log("✅ DONE — one email sent successfully. Do NOT run this script again.");
  }
}
main().catch(console.error);
