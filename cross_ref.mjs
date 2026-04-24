import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [members] = await conn.query('SELECT id, discordDisplayName, discordUsername, email, subscriptionStatus, stripeCustomerId, stripeSubscriptionId FROM members WHERE subscriptionStatus = "active"');

console.log('=== DB Members with active status (' + members.length + ') ===');
for (const m of members) {
  const hasCust = m.stripeCustomerId && !m.stripeCustomerId.startsWith('cs_');
  const hasSub = Boolean(m.stripeSubscriptionId);
  const status = (hasCust && hasSub) ? 'PAYING' : 'COMPED';
  console.log(status + ' | ' + (m.discordDisplayName || m.discordUsername) + ' | ' + m.email + ' | cust:' + (m.stripeCustomerId || 'NULL') + ' | sub:' + (m.stripeSubscriptionId || 'NULL'));
}

// Stripe CSV data (from the export)
const stripeData = [
  { name: 'Henrico W Klop', email: 'henrico@pavementsolutionsinc.ca', custId: 'cus_UEdifH7t4YJ06V', subId: 'sub_1TGARTJdDAUSVXbNLH5IhDxi', amount: 497 },
  { name: 'Darian Betancourt', email: 'darian@vertexctg.com', custId: 'cus_UEcn1F8PBPC0wY', subId: 'sub_1TG9XzJdDAUSVXbNHw9vEsMO', amount: 497 },
  { name: 'Giuseppe Di Lorenzo', email: 'joey@mcmdlusso.com', custId: 'cus_UDr8yTdkqRstfp', subId: 'sub_1TFPPnJdDAUSVXbNJ71QZK2q', amount: 497 },
  { name: 'Daniel Billingsley', email: 'dan@growmybluecollar.com', custId: 'cus_UDKuHSvTMX0htW', subId: 'sub_1TEuEqJdDAUSVXbNszJzRY4q', amount: 497 },
  { name: 'Caleb Morrow', email: 'caleb@morrow-builds.com', custId: 'cus_UD7oY6OX9YlLoW', subId: 'sub_1TEhYUJdDAUSVXbNbKq58gfM', amount: 497 },
  { name: 'Marshall Wilkinson', email: 'wilkinson.marshall@gmail.com', custId: 'cus_UCnJRk2p8n5ool', subId: 'sub_1TENilJdDAUSVXbNcbkMyTy1', amount: 497 },
  { name: 'Michael G Eargle', email: 'michael@mecontracting.us', custId: 'cus_UCiJZjpx8II5nW', subId: 'sub_1TEIstJdDAUSVXbNbAkIbk5M', amount: 497 },
  { name: 'North Legacy Builders', email: 'contact@northlegacybuilders.com', custId: 'cus_U7GM0U6ubJlHug', subId: 'sub_1T91pbJdDAUSVXbN4ecC2M3Z', amount: 197 },
  { name: 'Lebrenti L Bracey', email: 'odysseyplumbingllc@gmail.com', custId: 'cus_U69zqSpiYgHzPd', subId: 'sub_1T7xf8JdDAUSVXbNL8mdYeDH', amount: 197 },
];

console.log('\n=== Stripe subscribers NOT matched in DB ===');
const dbEmails = members.map(m => (m.email || '').toLowerCase());
for (const s of stripeData) {
  if (!dbEmails.includes(s.email.toLowerCase())) {
    console.log('NOT IN DB: ' + s.name + ' | ' + s.email + ' | ' + s.custId);
  }
}

console.log('\n=== DB members missing Stripe data (need update) ===');
for (const m of members) {
  const hasCust = m.stripeCustomerId && !m.stripeCustomerId.startsWith('cs_');
  const hasSub = Boolean(m.stripeSubscriptionId);
  if (!hasCust || !hasSub) {
    // Try to find matching Stripe record
    const match = stripeData.find(s => s.email.toLowerCase() === (m.email || '').toLowerCase());
    if (match) {
      console.log('MATCH FOUND: ' + (m.discordDisplayName || m.discordUsername) + ' (' + m.email + ') -> ' + match.custId + ' / ' + match.subId);
    } else {
      console.log('NO STRIPE MATCH: ' + (m.discordDisplayName || m.discordUsername) + ' (' + m.email + ') | ID: ' + m.id);
    }
  }
}

// Also check the two $197 plans
console.log('\n=== Price plan breakdown ===');
for (const s of stripeData) {
  const plan = s.amount === 197 ? 'Contractor School ($197)' : 'Contractor Circle ($497)';
  console.log(plan + ' | ' + s.name + ' | ' + s.email);
}

await conn.end();
