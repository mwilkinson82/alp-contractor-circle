import { config } from "dotenv";
config({ path: ".env" });

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Import the shared email builder
const { sendEosPlaybookAnnouncementEmail } = await import("./email.ts");

console.log("Sending EOS Playbook announcement preview to Marshall...");

const result = await sendEosPlaybookAnnouncementEmail({
  to: "marshall@marshallwilkinson.com",
  name: "Marshall",
});

console.log("Result:", result);
process.exit(0);
