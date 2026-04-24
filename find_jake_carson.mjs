import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// List ALL customers and subscriptions to find Jake and Carson
console.log('=== ALL Stripe Customers ===');
let hasMore = true;
let startingAfter = undefined;
const allCustomers = [];

while (hasMore) {
  const params = { limit: 100 };
  if (startingAfter) params.starting_after = startingAfter;
  const list = await stripe.customers.list(params);
  allCustomers.push(...list.data);
  hasMore = list.has_more;
  if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
}

console.log('Total customers in Stripe: ' + allCustomers.length);
console.log();

for (const c of allCustomers) {
  const nameLC = (c.name || '').toLowerCase();
  const emailLC = (c.email || '').toLowerCase();
  // Look for Jake or Carson
  if (nameLC.includes('jake') || nameLC.includes('carson') || nameLC.includes('holden') || nameLC.includes('nci') || 
      emailLC.includes('jake') || emailLC.includes('carson') || emailLC.includes('holden') || emailLC.includes('nci') ||
      emailLC.includes('nciconstruction') || emailLC.includes('huffman')) {
    console.log('FOUND: ' + c.id + ' | ' + c.name + ' | ' + c.email + ' | created: ' + new Date(c.created * 1000).toISOString());
    // Get their subscriptions
    const subs = await stripe.subscriptions.list({ customer: c.id, limit: 10 });
    for (const s of subs.data) {
      console.log('  SUB: ' + s.id + ' | ' + s.status + ' | $' + (s.items.data[0]?.price?.unit_amount / 100) + '/mo');
    }
  }
}

// Also list ALL active subscriptions
console.log('\n=== ALL Active Subscriptions ===');
let subHasMore = true;
let subStartingAfter = undefined;
const allSubs = [];

while (subHasMore) {
  const params = { status: 'active', limit: 100 };
  if (subStartingAfter) params.starting_after = subStartingAfter;
  const list = await stripe.subscriptions.list(params);
  allSubs.push(...list.data);
  subHasMore = list.has_more;
  if (list.data.length > 0) subStartingAfter = list.data[list.data.length - 1].id;
}

console.log('Total active subscriptions: ' + allSubs.length);
for (const s of allSubs) {
  const cust = allCustomers.find(c => c.id === s.customer);
  const amount = s.items.data[0]?.price?.unit_amount / 100;
  console.log(s.id + ' | ' + (cust?.name || 'unknown') + ' | ' + (cust?.email || 'unknown') + ' | $' + amount + '/mo | ' + s.status);
}
