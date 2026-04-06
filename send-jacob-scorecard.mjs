import { sendEosScorecardAnnouncementEmail } from "./server/email.ts";
async function main() {
  const result = await sendEosScorecardAnnouncementEmail({ to: "jhuffman@huffmancc.com", name: "Jacob Huffman" });
  console.log("Result:", JSON.stringify(result, null, 2));
}
main().catch(console.error);
