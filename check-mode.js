// Check if webhook secret is for test or live mode
require('dotenv').config();

console.log('\n🔍 WEBHOOK MODE CHECK');
console.log('═══════════════════════════════════════════════════════════\n');

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (webhookSecret) {
  console.log(`Webhook Secret: ${webhookSecret.substring(0, 20)}...`);
  console.log(`Full Secret: ${webhookSecret}`);
} else {
  console.log('❌ Webhook secret NOT SET!');
}

if (stripeKey) {
  if (stripeKey.startsWith('sk_test_')) {
    console.log('\n🧪 Stripe Key: TEST MODE');
  } else if (stripeKey.startsWith('sk_live_')) {
    console.log('\n🔴 Stripe Key: LIVE MODE');
  } else {
    console.log('\n⚠️  Stripe Key: UNKNOWN FORMAT');
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('⚠️  IMPORTANT:');
console.log('   - TEST mode payments need TEST mode webhook (whsec_...)');
console.log('   - LIVE mode payments need LIVE mode webhook (whsec_...)');
console.log('   - They MUST MATCH or webhook will not fire!');
console.log('\n💡 In Stripe Dashboard:');
console.log('   1. Check toggle (top right): "Test mode" or "Live mode"');
console.log('   2. Go to: Developers → Webhooks');
console.log('   3. Make sure webhook is created in the SAME mode as payments');
console.log('═══════════════════════════════════════════════════════════\n');

