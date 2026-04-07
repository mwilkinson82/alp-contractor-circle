import 'dotenv/config';

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DARIAN_DISCORD_ID = '352280601702825984';

async function main() {
  // First get all roles to find Contractor Circle role ID
  const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }
  });
  
  if (rolesRes.status !== 200) {
    console.log('Failed to fetch roles:', rolesRes.status, await rolesRes.text());
    return;
  }
  
  const allRoles = await rolesRes.json();
  const ccRole = allRoles.find(r => r.name.toLowerCase().includes('contractor'));
  
  if (!ccRole) {
    console.log('Contractor Circle role not found. Available roles:');
    allRoles.forEach(r => console.log(`  ${r.id}: ${r.name}`));
    return;
  }
  
  console.log(`Found Contractor Circle role: ${ccRole.name} (${ccRole.id})`);
  
  // Check current member roles
  const memberRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${DARIAN_DISCORD_ID}`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }
  });
  
  if (memberRes.status === 404) {
    console.log('Darian is NOT in the Discord server.');
    return;
  }
  
  const member = await memberRes.json();
  console.log(`Member: ${member.user.username} (${member.nick || member.user.global_name})`);
  console.log('Current roles:', member.roles.map(id => {
    const r = allRoles.find(role => role.id === id);
    return r ? r.name : id;
  }));
  
  if (member.roles.includes(ccRole.id)) {
    console.log('Already has Contractor Circle role.');
    return;
  }
  
  // Assign the role
  const assignRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${DARIAN_DISCORD_ID}/roles/${ccRole.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${BOT_TOKEN}` }
  });
  
  if (assignRes.status === 204) {
    console.log('✅ Contractor Circle role assigned to Darian/Damián B!');
  } else {
    console.log('Failed to assign role:', assignRes.status, await assignRes.text());
  }
}

main().catch(console.error);
