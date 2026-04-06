import { sendBootcampAnnouncementEmail } from "./server/email.ts";

const result = await sendBootcampAnnouncementEmail({
  to: "marshall@marshallwilkinson.com",
  name: "Marshall",
});

console.log("Preview result:", JSON.stringify(result, null, 2));
process.exit(0);
