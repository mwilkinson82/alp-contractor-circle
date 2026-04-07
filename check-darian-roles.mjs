import 'dotenv/config';

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DARIAN_DISCORD_ID = '352280601702825984';

async function main() {
  // Get member info
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${DARIAN_DISCORD_ID}`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }
  });
  
  if (res.status === 404) {
    console.log('Darian is NOT in the Discord server.');
    return;
  }
  
  if (res.status !== 200) {
    console.log('Error:', res.status, await res.text());
    return;
  }
  
  const member = await res.json();
  console.log('Discord username:', member.user.username);
  console.log('Display name:', member.nick || member.user.global_name);
  console.log('Role IDs:', member.roles);
  
  // Get all roles to map IDs to names
  const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }
  });
  const allRoles = await rolesRes.json();
  const roleMap = {};
  allRoles.forEach(r => { roleMap[r.id] = r.name; });
  
  console.log('Role names:', member.roles.map(id => roleMap[id] || id));
  
  // Check if Contractor Circle role is present
  const ccRole = allRoles.find(r => r.name.toLowerCase().includes('contractor'));
  if (ccRole) {
    console.log('\nContractor Circle role ID:', ccRole.id);
    console.log('Has Contractor Circle role:', member.roles.includes(ccRole.id));
  }
}

main().catch(console.error);
