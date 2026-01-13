// Simpler approach: Create a charge directly using test token
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function addTestFunds() {
  console.log('\n💰 ADDING FUNDS TO STRIPE TEST ACCOUNT\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Amount to add (in cents) - let's add $10,000
    const amount = 1000000; // $10,000.00
    
    console.log('1️⃣ Creating Charge using test token...');
    console.log(`   Amount: $${(amount / 100).toFixed(2)}`);
    console.log('   Token: tok_visa (generic Visa test token)\n');
    
    // Use the generic test token tok_visa which works without raw card API
    const charge = await stripe.charges.create({
      amount: amount,
      currency: 'usd',
      source: 'tok_visa', // Generic test token that always works
      description: 'Adding test funds to available balance',
    });
    
    console.log(`   ✅ Charge created: ${charge.id}`);
    console.log(`   Status: ${charge.status}\n`);
    
    console.log('2️⃣ Checking balance...\n');
    
    const balance = await stripe.balance.retrieve();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ FUNDS ADDED SUCCESSFULLY!\n');
    console.log('💰 AVAILABLE BALANCE:\n');
    
    balance.available.forEach(bal => {
      const amount = (bal.amount / 100).toFixed(2);
      console.log(`   ${bal.currency.toUpperCase()}: $${amount}`);
    });
    
    console.log('\n📊 PENDING BALANCE:\n');
    
    balance.pending.forEach(bal => {
      const amount = (bal.amount / 100).toFixed(2);
      console.log(`   ${bal.currency.toUpperCase()}: $${amount}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('🎉 You can now process escrow transfers!\n');
    console.log('💡 Try verifying transaction 9 again in the admin dashboard.\n');
    console.log('ℹ️  Note: In test mode, these funds are available immediately.\n');
    
  } catch (error) {
    console.error('❌ Error adding funds:', error.message);
    
    if (error.code === 'balance_insufficient') {
      console.log('\n💡 TIP: Run this script multiple times to add more funds.\n');
    }
  }
  
  process.exit(0);
}

addTestFunds();
