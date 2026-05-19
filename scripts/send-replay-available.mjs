import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Marshall Wilkinson | ALP <notifications@notifications.marshallwilkinson.com>";

const members = [
  { email: "ajhoover@mac.com", name: "AJ" },
  { email: "caleb@morrow-builds.com", name: "Caleb" },
  { email: "carson@holdenexcavating.com", name: "Carson" },
  { email: "dan@heatwaveflorida.com", name: "Dan" },
  { email: "kingconstructionofny@gmail.com", name: "Daniel" },
  { email: "darianb280@hotmail.com", name: "Darian" },
  { email: "dan@delmontebuilders.com", name: "Dan" },
  { email: "nav@fiveriversig.com", name: "Nav" },
  { email: "henklop@gmail.com", name: "Henrico" },
  { email: "intricatehvac@gmail.com", name: "Chris" },
  { email: "jhuffman@huffmancc.com", name: "Jake" },
  { email: "jake@nciconstruction.com", name: "Jake" },
  { email: "lescano0456@gmail.com", name: "Joaquin" },
  { email: "joey@mcmdlusso.com", name: "Joey" },
  { email: "hacheconstruction@gmail.com", name: "Julian" },
  { email: "brandofsacrificeshogun@gmail.com", name: "Justin" },
  { email: "justinraymondramirez@gmail.com", name: "Justin" },
  { email: "marco@nxlgroup.com", name: "Marco" },
  { email: "michael@mecontractingpros.com", name: "Michael" },
  { email: "mlee@newyorkconcrete.com", name: "Miguel" },
  { email: "nathan@olivetreebuilds.ca", name: "Nathan" },
  { email: "preston@barcbuildergroup.com", name: "Preston" },
  { email: "office@sageconstructiondevelopment.com", name: "Ronnie" },
  { email: "tony@munozsuarez.com", name: "Tony" },
  { email: "Andy.j.ramirez@outlook.com", name: "Andy" },
];

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;color:#f5f0e8;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c4783e;">Contractor Circle</span>
    </div>

    <div style="background:linear-gradient(135deg,rgba(196,120,62,0.08),transparent);border:1px solid rgba(196,120,62,0.2);border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="font-size:26px;font-weight:700;color:#f5f0e8;margin:0 0 16px;line-height:1.3;">🎬 Last Night's Replay Is Live</h1>
      
      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:0 0 20px;">Hey ${firstName} —</p>

      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:0 0 20px;">Last night's Contractor Circle call with guest speaker <strong style="color:#f5f0e8;">Jermaine Warren</strong> is now available in the Replay Library.</p>

      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:0 0 20px;">Whether you were on the call and want to rewatch, or you missed it — the full replay is ready for you inside the portal.</p>

      <div style="text-align:center;margin:32px 0 16px;">
        <a href="https://app.alpcontractorcircle.com/login" style="display:inline-block;background:linear-gradient(135deg,#c4783e,#a0622f);color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Watch the Replay →</a>
      </div>

      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:24px 0 0;">Don't sleep on this one.</p>
    </div>

    <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(196,120,62,0.15);">
      <p style="font-size:12px;color:rgba(245,240,232,0.3);margin:0;">ALP Contractor Circle</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendAll() {
  let sent = 0;
  let failed = 0;

  for (const member of members) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: member.email,
        subject: "Replay Available: Contractor Circle w/ Jermaine Warren",
        html: buildHtml(member.name),
      });

      if (error) {
        console.error(`FAILED: ${member.email} — ${error.message}`);
        failed++;
      } else {
        console.log(`SENT: ${member.email} (${member.name}) — ID: ${data.id}`);
        sent++;
      }

      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`ERROR: ${member.email} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}, Total: ${members.length}`);
}

sendAll();
