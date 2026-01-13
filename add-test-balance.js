// Add funds to Stripe test account using special test card
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function addTestBalance() {
  console.log('\n💰 ADDING TEST BALANCE TO STRIPE ACCOUNT\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Create a charge using the special test card that adds to available balance
    // Card: 4000000000000077
    const amount = 500000; // $5,000 in cents
    
    console.log(`💳 Creating charge with special test card 4000000000000077...`);
    console.log(`💵 Amount: $${(amount / 100).toFixed(2)} USD\n`);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card'],
      payment_method_data: {
        type: 'card',
        card: {
          token: 'tok_bypassPending', // This bypasses pending balance in test mode
        },
      },
      confirm: true,
      automatic_payment_methods: {
        enabled: false,
      },
    });
    
    console.log('✅ Payment Intent Created:');
    console.log(`   ID: ${paymentIntent.id}`);
    console.log(`   Status: ${paymentIntent.status}`);
    console.log(`   Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
    
    // Check balance
    console.log('\n🔍 Checking current balance...');
    const balance = await stripe.balance.retrieve();
    
    console.log('\n📊 CURRENT BALANCE:');
    console.log('═══════════════════════════════════════════════════════════');
    
    balance.available.forEach(bal => {
      console.log(`✅ Available: $${(bal.amount / 100).toFixed(2)} ${bal.currency.toUpperCase()}`);
    });
    
    balance.pending.forEach(bal => {
      console.log(`⏳ Pending: $${(bal.amount / 100).toFixed(2)} ${bal.currency.toUpperCase()}`);
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'balance_insufficient') {
      console.log('\n💡 ALTERNATIVE SOLUTION:\n');
      console.log('You need to manually create a payment using the special test card:');
      console.log('   Card Number: 4000000000000077');
      console.log('   This card adds funds directly to available balance.\n');
      console.log('Steps:');
      console.log('1. Go to: https://dashboard.stripe.com/test/payments');
      console.log('2. Click "Create payment"');
      console.log('3. Enter amount: $5,000.00');
      console.log('4. Use card: 4000000000000077');
      console.log('5. Complete the payment\n');
    }
  }
  
  process.exit(0);
}

addTestBalance();

