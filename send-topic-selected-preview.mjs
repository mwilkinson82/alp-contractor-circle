/**
 * Send Topic Selected preview to Marshall for approval.
 * Single send only.
 */
import { sendTopicSelectedEmail } from "./server/email.ts";

async function main() {
  console.log("Sending Topic Selected preview to Marshall...");
  
  const result = await sendTopicSelectedEmail({
    to: "marshall@marshallwilkinson.com",
    name: "Tony",
    topic: "Private Equity",
    bootcampDate: "2025-04-26",
  });
  
  if (result.success) {
    console.log(`✅ Preview sent — Resend ID: ${result.id}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
