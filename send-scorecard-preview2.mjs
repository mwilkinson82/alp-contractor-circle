/**
 * Send EOS Scorecard announcement preview to Marshall (correct email).
 */
import { sendEosScorecardAnnouncementEmail } from "./server/email.ts";

async function main() {
  console.log("Sending EOS Scorecard announcement preview to marshall@marshallwilkinson.com...");
  const result = await sendEosScorecardAnnouncementEmail({
    to: "marshall@marshallwilkinson.com",
    name: "Marshall",
  });
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
