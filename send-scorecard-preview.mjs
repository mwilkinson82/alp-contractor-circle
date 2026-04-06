/**
 * Send EOS Scorecard announcement preview to Marshall.
 * Run with: node send-scorecard-preview.mjs
 */
import { sendEosScorecardAnnouncementEmail } from "./server/email.ts";

const MARSHALL_EMAIL = "mwilkinson@saxumcapital.com";

async function main() {
  console.log("Sending EOS Scorecard announcement preview to Marshall...");
  const result = await sendEosScorecardAnnouncementEmail({
    to: MARSHALL_EMAIL,
    name: "Marshall",
  });
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
