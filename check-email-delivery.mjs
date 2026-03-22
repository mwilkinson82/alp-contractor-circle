import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const emails = [
  "ajhoover@mac.com",
  "office@sageconstructiondevelopment.com",
  "nathan@olivetreebuilds.ca",
  "dan@delmontebuilders.com",
];

(async () => {
  console.log("Checking email delivery status from Resend API...\n");
  
  for (const email of emails) {
    try {
      const response = await resend.emails.list();
      
      if (!response.data) {
        console.log(`❌ ${email}: No data returned from API`);
        continue;
      }

      const sentEmails = response.data.filter(e => e.to === email);
      
      if (sentEmails.length === 0) {
        console.log(`❌ ${email}: No emails found in Resend`);
        continue;
      }

      console.log(`✅ ${email}:`);
      sentEmails.forEach((e, idx) => {
        console.log(`   Email ${idx + 1}:`);
        console.log(`   - ID: ${e.id}`);
        console.log(`   - Subject: ${e.subject}`);
        console.log(`   - Status: ${e.status}`);
        console.log(`   - Created: ${e.created_at}`);
        console.log(`   - From: ${e.from}`);
        
        if (e.subject && (e.subject.includes("Welcome") || e.subject.includes("Contractor Circle"))) {
          console.log(`   ✓ This is a welcome/circle email`);
        }
        console.log();
      });
    } catch (error) {
      console.error(`Error checking ${email}:`, error);
    }
  }
})();
