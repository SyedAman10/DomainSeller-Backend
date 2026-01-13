// Check which Stripe account we're using
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkStripeAccount() {
  console.log('\n🔍 CHECKING STRIPE ACCOUNT\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const account = await stripe.account.retrieve();
    
    console.log('✅ Connected to Stripe Account:');
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Email: ${account.email || 'Not set'}`);
    console.log(`   Business Name: ${account.business_profile?.name || 'Not set'}`);
    console.log(`   Country: ${account.country}`);
    console.log(`   Type: ${account.type}`);
    console.log(`   Charges Enabled: ${account.charges_enabled}`);
    console.log(`   Payouts Enabled: ${account.payouts_enabled}`);
    
    console.log('\n💡 Make sure you\'re viewing THIS account in Stripe Dashboard!');
    console.log(`   Account ID to look for: ${account.id}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkStripeAccount();

