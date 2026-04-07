/**
 * Send Topic Selected email to Tony Munoz.
 * Single send only — do NOT run this script more than once.
 */
import { sendTopicSelectedEmail } from "./server/email.ts";

async function main() {
  console.log("Sending Topic Selected email to Tony Munoz...");
  
  const result = await sendTopicSelectedEmail({
    to: "tony.a.munoz@gmail.com",
    name: "Tony",
    topic: "Private Equity",
    bootcampDate: "2025-04-26",
  });
  
  if (result.success) {
    console.log(`✅ Sent to Tony — Resend ID: ${result.id}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
