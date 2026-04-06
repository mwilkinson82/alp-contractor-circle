import { sendBootcampAnnouncementEmail } from "./server/email.ts";

async function main() {
  const result = await sendBootcampAnnouncementEmail({
    to: "marshall@marshallwilkinson.com",
    name: "Marshall",
  });
  console.log("Result:", JSON.stringify(result, null, 2));
  if (result.success) {
    console.log("✅ Preview sent to marshall@marshallwilkinson.com — Resend ID:", result.id);
  } else {
    console.error("❌ Failed:", result.error);
  }
}

main().catch(console.error);
