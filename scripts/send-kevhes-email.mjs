/**
 * Send email to kevhes (kevin.hessam@gmail.com) informing them
 * they need to join Contractor Circle for access.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const { data, error } = await resend.emails.send({
    from: "ALP Team <notifications@notifications.marshallwilkinson.com>",
    to: "kevin.hessam@gmail.com",
    subject: "Want Access to Our Tools? Join The Contractor Circle",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
        <p style="font-size: 16px; line-height: 1.6;">Hey Kevin,</p>
        
        <p style="font-size: 16px; line-height: 1.6;">We noticed you tried to access the ALP Contractor Circle member portal.</p>
        
        <p style="font-size: 16px; line-height: 1.6;">Our tools — including <strong>ConstructLine Basis</strong> (estimating) and <strong>ConstructLine Baseline</strong> (CPM scheduling) — are exclusive to Contractor Circle members.</p>
        
        <p style="font-size: 16px; line-height: 1.6;">If you're interested in joining, check out <a href="https://alpcontractorcircle.com" style="color: #c8a052; text-decoration: underline;">alpcontractorcircle.com</a> for details on membership.</p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-top: 32px;">— ALP Team</p>
        
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin-top: 40px;" />
        <p style="font-size: 12px; color: #888;">ALP Contractor Circle</p>
      </div>
    `,
  });

  if (error) {
    console.error("[ERROR] Failed to send email:", error);
    process.exit(1);
  }

  console.log(`[OK] Email sent to kevin.hessam@gmail.com — Resend ID: ${data.id}`);
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
