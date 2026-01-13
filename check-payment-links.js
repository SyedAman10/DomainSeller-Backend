// Get the actual payment link URL from Stripe
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function getPaymentLinkUrl() {
  console.log('\n🔍 CHECKING PAYMENT LINKS\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Check the most recent payment link
    const paymentLinks = await stripe.paymentLinks.list({ limit: 5 });
    
    console.log(`Found ${paymentLinks.data.length} payment links:\n`);
    
    for (const link of paymentLinks.data) {
      const lineItems = await stripe.paymentLinks.listLineItems(link.id);
      const amount = lineItems.data[0]?.amount_total || 0;
      
      console.log(`${paymentLinks.data.indexOf(link) + 1}. Payment Link ID: ${link.id}`);
      console.log(`   URL: ${link.url}`);
      console.log(`   Active: ${link.active}`);
      console.log(`   Amount: $${amount / 100}`);
      console.log(`   Created: ${new Date(link.created * 1000).toLocaleString()}`);
      console.log('');
    }
    
    if (paymentLinks.data.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🎯 USE THIS LINK TO TEST:');
      console.log(`\n${paymentLinks.data[0].url}\n`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('\n📋 Steps:');
      console.log('1. Open this link in INCOGNITO/PRIVATE window');
      console.log('2. Complete payment with: 4242 4242 4242 4242');
      console.log('3. After success, go to Stripe Dashboard → Payments');
      console.log('4. You SHOULD see the payment there');
      console.log('5. If you see it, webhook should fire automatically\n');
    }
    
    // Also check for recent checkout sessions
    console.log('\n📊 Recent Checkout Sessions:');
    const sessions = await stripe.checkout.sessions.list({ limit: 5 });
    
    if (sessions.data.length === 0) {
      console.log('   ⚠️  No checkout sessions found - no payments have been attempted\n');
    } else {
      sessions.data.forEach((session, i) => {
        console.log(`\n${i + 1}. Session ID: ${session.id}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Payment Status: ${session.payment_status}`);
        console.log(`   Amount: $${session.amount_total / 100}`);
        console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
        console.log(`   Customer Email: ${session.customer_details?.email || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

getPaymentLinkUrl();

